# JobPilot — Interview Study Guide

Deep prep for talking about this project. Everything here is backed by real code in this
repo — you can point to it. Study the **"why"** behind each choice; that's what separates a
strong answer from a keyword.

---

## 1. The 30-second and 2-minute pitches

**30s:** "JobPilot is an AI job-search copilot I built. It scrapes jobs from company ATS feeds,
uses an LLM to score how well each one fits my résumé — with a written rationale — and can draft
tailored application material on demand. It's a TypeScript monorepo: Next.js frontend, a
queue-based worker, PostgreSQL, and Anthropic's API, deployed live on Vercel with a Neon database
and a scheduled GitHub Action doing the scraping and scoring."

**2min:** add the *why* — "I built it because my real work is private company code a recruiter
can't see, so I needed one deployed, verifiable full-stack project. The interesting parts are:
(1) it only spends LLM tokens on *newly-posted* jobs, not the stale backlog, so it costs cents a
day; (2) I tiered the models by task — a cheap model for extraction, a mid model for scoring, the
top model only for on-demand writing; (3) the whole thing runs free on serverless + a cron, and I
made deliberate simplicity choices like polling over WebSockets because the update cadence is
gated upstream."

---

## 2. Architecture — and why this shape

```
Browser ─▶ Next.js (Vercel)  ─── REST route handlers ──▶ PostgreSQL (Neon)
             React Query UI                                    ▲
                                                               │ ingest + score
GitHub Action (cron, every 15m) ─▶ poll-once ─▶ scrapers ──────┘
                                        └▶ Anthropic API (Haiku/Sonnet)
Local dev only: BullMQ + Redis worker (queues + scheduled poll)
```

- **Monorepo (pnpm workspaces):** `apps/web`, `apps/worker`, `packages/db`, `packages/core`.
  *Why:* shared types and DB client across frontend and worker without publishing packages;
  one install, one typecheck, atomic changes across the stack.
- **`packages/core`** is pure functions (matching/filtering) with no I/O — *why:* trivially
  unit-testable, and shared by both the worker and the web API.
- **Two runtimes for the worker:** a BullMQ/Redis queue worker for local/always-on, and a
  simple `poll-once` script for the serverless cron. *Why:* the queue is the "real" async
  architecture; the cron is what actually fits a free serverless deploy. (See §8.)

**Likely Q: "Why a monorepo instead of separate repos?"** Shared `packages/core` types and the
Prisma client are used by both the API and the worker; a monorepo keeps them in lockstep with
one type-check and no version drift. For a solo project the overhead is near zero.

---

## 3. Data model (Prisma / Postgres)

- **Job** — `@@unique([source, sourceJobId])` is the dedup key (the ATS's own id, namespaced by
  source). `rawJd` (full JD text) is stored because the AI needs it.
- **JobEnrichment** (1:1) — structured fields an LLM extracts (seniority, minYears, stack, …).
- **FitScore** (1:1) — score 0–100, matchedSkills, gaps, rationale, model.
- **Resume** — the single active résumé everything is scored against (`active` flag lets you
  A/B versions).
- **Application** — status enum (SAVED→APPLIED→INTERVIEW→OFFER→REJECTED), `tailoredDraft`.

**Q: "How do you avoid duplicate jobs?"** A compound unique constraint on `(source,
sourceJobId)` + Prisma `upsert`. Re-running the scraper never inserts a dupe.

**Q: "Why 1:1 tables instead of columns on Job?"** Separation of concerns and cost: enrichment
and scores are LLM-generated and optional; keeping them separate means a job exists before it's
scored, and I can re-score without touching the job row.

---

## 4. Scrapers (ingestion)

- Three ATS sources — **Greenhouse, Lever, Ashby** — all public JSON APIs. Greenhouse needs
  `?content=true` to return the full JD; Lever/Ashby expose `descriptionPlain`.
- Ported from a Python side-project (JobAlert) to TypeScript. Filters: title-keyword match,
  location (a "multi" allow/deny model), an experience cap parsed from the title, and a
  seniority/off-stack exclude list.
- `Promise.allSettled` across sources so one failing ATS doesn't sink the run.

**Q: "How do you decide which jobs to score?"** `ingestAll()` returns the ids of jobs that were
*newly created* (I query existing `(source, sourceJobId)` keys first, then diff). Only those get
scored — so the stale backlog is never re-scored and tokens are spent only on fresh postings.

**Q: "Weakness of that design?"** If scoring fails for a newly-created job, it won't be retried
(next poll sees it as existing). I mitigated the main cause (see §9 truncated-JSON bug); a fuller
fix would be a `scoredAt`/status marker so failed jobs get picked up again.

---

## 5. LLM integration (the differentiator)

- **Official `@anthropic-ai/sdk`**, not raw HTTP.
- **Tiered models by task** — a deliberate cost/quality decision:
  - `claude-haiku-4-5` — JD field extraction (high volume, mechanical).
  - `claude-sonnet-5` — fit scoring (needs judgment; near-Opus quality at ~⅓ cost).
  - `claude-opus-4-8` — on-demand tailoring only (quality-critical, low volume).
- **Structured outputs** (`output_config.format` json_schema) so extraction/scoring return
  validated JSON — no brittle string parsing.
- **Prompt caching** — the résumé + rubric are a cached system prefix, so scoring many jobs
  reuses that cache (~90% cheaper on those tokens).
- **LLM-judge, not embeddings** — Claude reads (résumé, JD) and returns a score + rationale.
  *Why not RAG/embeddings?* Single provider (Anthropic has no embeddings API — would need a 2nd
  vendor), simpler, and the rationale is a feature. Embeddings would be a Phase-2 pre-filter at
  scale.

**Q: "Why not use the most powerful model everywhere?"** Cost. Scoring is the high-volume path;
Sonnet is near-Opus on that judgment task at a third of the price. Opus is reserved for writing,
where quality matters and volume is low. Tiering keeps the whole thing at cents/day.

**Q: "How do you keep costs down?"** Three levers: score only new jobs, tier models, cache the
résumé prefix. A full backlog rescore is ~$5; day-to-day is cents.

**Q: "How do you stop it inventing experience in the tailoring?"** The system prompt instructs
it to draw only on the résumé; I verified outputs cite real experience. (Honesty was a hard
requirement — this is a job search, not fiction.)

---

## 6. Frontend (Next.js + React Query)

- **Next.js App Router**, React 19, Tailwind v4. Pages that read the DB are
  `export const dynamic = "force-dynamic"` (no build-time DB access).
- **REST route handlers** (`/api/jobs`, `/api/jobs/[id]/application`, `/api/jobs/[id]/tailor`).
- **React Query** for all server state: filters (score/source/remote/country), sort, and
  **optimistic mutations** on the kanban (drag a card → status updates instantly, rolls back on
  error).
- **Kanban** via `@dnd-kit/core` — droppable columns per status, draggable cards.
- **Auto-refresh** — `refetchInterval: 60_000` surfaces newly-scored jobs without a reload.

**Q: "Why React Query instead of useEffect + fetch?"** Caching, background refetch,
request dedup, and first-class optimistic updates with rollback — all of which I'd otherwise
hand-roll and get subtly wrong. The kanban's optimistic status change is a clean example.

**Q: "Server components vs client components here?"** Interactive, stateful views (filters,
drag-drop) are client components fetching via React Query. I kept API access in route handlers so
the client never imports Prisma.

**Q: "WebSockets?"** Considered, chose 60s polling — updates are gated by a 15-min scraper cron,
so push would be complexity for no benefit, and it needs an always-on server the free serverless
deploy doesn't have. Polling is simpler and more than fast enough. *(This is a deliberate
tradeoff, not a gap.)*

---

## 7. The async worker (BullMQ / Redis)

- Local: two BullMQ queues (`ingest`, `score`) on Redis, plus a repeatable job that polls every
  5 min. Ingest enqueues a score job per *new* posting; the score worker runs at concurrency 3.
- BullMQ gets **connection options** (host/port), not an ioredis instance — see §9 for why.

**Q: "Why a queue at all?"** Decouples scraping from scoring, gives retries and concurrency
control, and models the real "fan out work to background workers" pattern. In production I use a
simpler cron path (below), but the queue is how it works when run always-on.

---

## 8. Deployment (free, serverless + cron)

- **Vercel** hosts the Next.js app. **Neon** is the managed Postgres. A **scheduled GitHub
  Action** (`.github/workflows/poll.yml`, every ~15 min) runs `poll-once` — ingest + score new
  jobs — against Neon.
- *Why this shape?* $0/month. There's no always-on server, so the BullMQ/Redis worker doesn't run
  in prod; the cron does the same work via `poll-once` (no queue). Tailoring runs on-demand in a
  Vercel serverless function.

**Q: "Why cron instead of hosting the worker?"** Cost and fit. A single-user app whose data
changes every 15 min doesn't need an always-on process — a scheduled job is simpler, free, and
sufficient. The queue-based worker is there for local/scale; the cron is the right prod choice.
That's the same "match the tool to the actual need" judgment as the WebSocket decision.

**Q: "How would you scale this to many users?"** Per-user résumés and row-level scoping; move
scoring to the always-on BullMQ worker (or a durable queue) instead of a cron; add a pgvector
pre-filter to cut LLM calls; connection pooling (Neon pooler / PgBouncer) for concurrency;
rate-limit the ATS scrapers.

---

## 9. Hard bugs I debugged (your "tell me about a challenging bug" stories)

These are gold — practice telling each as: symptom → investigation → root cause → fix.

1. **Live site showed an empty page; API returned `[]`.** Everything worked locally and in the
   GitHub Action, but not on Vercel. I'd set the DB env var and redeployed — still empty. I added
   a temporary debug flag to surface the swallowed error and found:
   *"Prisma Client could not locate the Query Engine for runtime `rhel-openssl-3.0.x`."*
   **Root cause:** in a pnpm monorepo, Next's bundler didn't copy Prisma's Linux query-engine
   binary into the serverless function. **Fix:** add `binaryTargets = ["native",
   "rhel-openssl-3.0.x"]` to the schema *and* `outputFileTracingRoot` + `outputFileTracingIncludes`
   in `next.config` so the engine ships with the function. *Lesson:* the catch block was hiding
   the real error — always surface it while debugging.

2. **Scheduled scoring crashed mid-run.** The cron scored ~18 jobs then exited 1. Error:
   `SyntaxError: Unterminated string in JSON`. **Root cause:** `max_tokens: 1024` truncated a
   verbose scoring response, producing invalid JSON that `JSON.parse` choked on — and one bad job
   took down the whole loop. **Fix:** raised `max_tokens` to 2048 (root cause) *and* wrapped
   per-job scoring in try/catch so one failure can't fail the batch (resilience).

3. **Worker wouldn't typecheck: two `ioredis` versions.** BullMQ bundles its own ioredis; my
   direct dependency resolved a different minor version, so an ioredis instance wasn't assignable
   to BullMQ's connection type. **Fix:** pass connection *options* to BullMQ instead of an
   instance, and drop the direct ioredis dep — one version in the tree.

4. **Neon cold start.** Free-tier Neon scales the compute to zero when idle; the first connection
   after idle can hard-fail. Surfaced as an intermittent empty response. Relevant context for the
   §9.1 debugging (it was a red herring there — the real issue was the Prisma engine).

5. **Tooling:** pnpm 10+ blocks dependency build scripts (Prisma engine, esbuild) — had to
   allowlist them; pnpm 11 requires Node ≥22.13 so CI pins Node 22; Next rewrites its tsconfig on
   build so those files are prettier-ignored.

---

## 10. Security & correctness

- Secrets (`DATABASE_URL`, `ANTHROPIC_API_KEY`) live in GitHub Actions secrets and Vercel env —
  never committed; `.env*` is gitignored.
- The `ANTHROPIC_API_KEY` is only ever used server-side (worker + serverless routes), never
  shipped to the client.
- The web client never imports Prisma; all DB access is behind route handlers.
- DB errors are caught and degrade to an empty state rather than crashing the page.

---

## 11. What I'd do differently / next

- A `scoredAt`/status marker so failed scorings get retried (see §4).
- Pagination on `/api/jobs` (currently caps at 300).
- pgvector pre-filter before the LLM at scale.
- Vitest/RTL test coverage (the pure matching helpers are the easy, high-value start) and a
  Lighthouse pass — planned as the final step.
- Move scoring to the always-on worker if it became multi-user.

---

## 12. Rapid-fire (know these cold)

- **Stack?** TS monorepo · Next.js 15 (App Router) · React Query · Tailwind · Node/BullMQ worker ·
  PostgreSQL/Prisma · Redis (local) · Anthropic API · Vercel + Neon + GitHub Actions.
- **Dedup?** `@@unique([source, sourceJobId])` + upsert.
- **Why Sonnet for scoring?** Near-Opus judgment at ⅓ the cost; Opus reserved for writing.
- **Structured outputs?** `output_config.format` JSON schema → validated JSON, no string parsing.
- **Prompt caching?** Résumé/rubric cached as system prefix → ~90% cheaper repeat scoring.
- **Only-new-jobs scoring?** ingest diffs existing keys, scores only newly-created rows.
- **Real-time?** 60s polling; WebSockets would be over-engineering vs a 15-min cron.
- **Prod hosting?** Free: Vercel + Neon + scheduled GitHub Action (no always-on server).
- **Hardest bug?** Prisma query engine not bundled into Vercel's serverless function (monorepo).
