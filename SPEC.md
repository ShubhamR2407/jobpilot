# JobPilot — Specification (v0.2)

> **Locked decisions (2026-07-11):** (1) **tiered models** — Haiku/Sonnet/Opus by task;
> (2) **LLM-judge fit scoring** for v1 (embeddings/pgvector deferred to Phase 2);
> (3) **scrapers ported to TypeScript** — single-language repo, no Python; (4) **REST**
> route handlers + React Query (no GraphQL in v1).

> Working name: **JobPilot** (rename freely). This is the flagship full-stack project
> for Shubham's résumé — an AI job-search copilot. Goal: one deployed, self-owned,
> verifiable artifact that demonstrates **strong frontend + strong backend + real AI
> integration**, so it earns résumé lines for backend, frontend, and full-stack roles
> off a single project. Dogfooded on his own job search, so every decision is defensible
> in an interview.

---

## 1. Context & goals

**Why this exists.** Shubham's real work (Textract pipeline, multi-tenant SaaS, 10k-record
workers) is private company code no reviewer can see. His only public artifact is a college
group project on someone else's GitHub. In 2026 hiring, portfolio + live demo is the single
biggest shortlisting signal, and it's the gap that best explains his rejections. JobPilot
closes it and simultaneously converts "prepped" résumé keywords (Redis, GraphQL, WebSockets,
LLM integration, TypeScript, testing, Core Web Vitals) into things he has actually built.

**Non-goals (v1).** Multi-user SaaS, payments, mobile app, auth providers beyond email/OAuth,
scraping every job board on earth. Keep it a single-user (his) product that looks
production-grade, not a startup.

**Definition of done (v1).**

- Live URL + clean public GitHub repo with a README that maps résumé bullets → code.
- He uses it daily for his own search (real data, real value).
- Demonstrates, in verifiable code: React/Next + TS frontend, Node + TS backend API,
  PostgreSQL, Redis, an async worker/queue, one real LLM feature, WebSockets, and tests.
- A measured Core Web Vitals before/after story for the frontend.

---

## 2. What it does (features)

| #   | Feature                                                                                                                                    | Résumé signal it earns                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| F1  | **Ingest** jobs from Greenhouse/Lever/Ashby (reuse existing Python scrapers) into Postgres, deduped                                        | async workers, queues, data modeling           |
| F2  | **AI JD normalization** — LLM extracts structured fields (seniority, min-years, stack, remote-policy, responsibilities) from messy JD text | LLM integration, structured outputs            |
| F3  | **AI fit score** — score each job against his résumé (0–100) with a written rationale + matched-skills / gaps breakdown                    | the headline AI feature; "RAG"/LLM-judge story |
| F4  | **AI tailoring** — per job, draft a tailored résumé-bullet set / cover-letter / recruiter outreach message                                 | agentic "does real work" story                 |
| F5  | **Dashboard** — matched jobs with fit scores, filters, a résumé-vs-JD match view, saved-jobs kanban, applied tracking                      | React/Next depth, complex UI, state mgmt       |
| F6  | **Real-time** — new high-fit matches pushed live to the dashboard (toast + list update)                                                    | WebSockets                                     |
| F7  | **Perf** — virtualized job lists, code-split, cached; a Lighthouse before/after                                                            | Core Web Vitals / a11y                         |

Fit-score + tailoring are the differentiators. Everything else is table stakes that makes it
look production-grade.

---

## 3. Architecture (recommended)

Three deployables + two datastores. Chosen so the backend story is real (a separate worker
and queue), not just "Next.js API routes."

```
                 ┌─────────────────────────────┐
   Browser ─────▶│  Next.js app (App Router,TS)│  ← FE + BFF/API (REST route handlers)
                 │  React Query · Tailwind      │     REST + WebSocket endpoint
                 └───────────┬─────────────────┘
                             │ reads/writes
                             ▼
                        PostgreSQL  ◀── Prisma ORM (schema, migrations)
                             ▲
                             │ writes enriched jobs
                 ┌───────────┴─────────────────┐
   Redis  ◀─────▶│  Worker service (Node, TS)  │  ← BullMQ queues
   (queue+cache) │  TS scrapers → ingest →      │     calls Claude API
                 │  normalize → score           │     (scrapers ported from JobAlert)
                 └─────────────────────────────┘
```

**Why this shape.** The worker + BullMQ + Redis is the honest "asynchronous worker pipeline"
story he already lives at work — defensible in interviews. Next.js gives the FE depth and a
legit BFF. Everything is TypeScript end-to-end (reinforces his #1 keyword); the scrapers are
ported from the Python JobAlert sources into the worker (they're small public-JSON fetchers —
see §5).

**Repo layout (single repo, pnpm workspaces):**

```
jobpilot/
  apps/web/               Next.js (frontend + REST route handlers + WS)
  apps/worker/            Node worker: BullMQ processors, Claude calls
    src/scrapers/         greenhouse.ts, lever.ts, ashby.ts (ported from JobAlert)
  packages/db/            Prisma schema + client (shared)
  packages/core/          shared TS types, fit-score prompt/schema, zod schemas
```

---

## 4. Data model (Postgres, via Prisma) — first cut

- **Job** — id, source, sourceJobId (unique w/ source), title, company, location, url,
  rawJd (text), postedAt, ingestedAt. `@@unique([source, sourceJobId])` (mirrors current
  `uid`).
- **JobEnrichment** — jobId (1:1), seniority, minYears, stack (string[]), remotePolicy,
  responsibilities (string[]), model, tokensUsed, createdAt.
- **FitScore** — jobId, score (int), matchedSkills (string[]), gaps (string[]),
  rationale (text), model, createdAt.
- **Application** — jobId, status (enum: SAVED, APPLIED, INTERVIEW, REJECTED, OFFER),
  notes, tailoredDraft (text, nullable), updatedAt. Powers the kanban.
- **Resume** — id, content (his résumé text/structured), active (bool). The thing jobs are
  scored against; lets him A/B résumé versions.

> **Optional (Phase 2): pgvector.** Add `embedding vector` columns to Job + Resume for a
> cheap similarity pre-filter before the LLM fit-score. See §6 for the provider caveat.

---

## 5. Ingestion — scrapers ported to TypeScript

Port the three ATS scrapers from JobAlert `sources/` into `apps/worker/src/scrapers/`. They're
small — the Greenhouse one is a ~40-line public-JSON `GET` + filter — so this is a fast, clean
port, not a rewrite. Carry over the matching helpers (keyword/location/experience filters,
India-vs-global split) as TS utilities; drop the `SeenStore` JSON file — Postgres's
`@@unique([source, sourceJobId])` handles dedup now.

**One required change vs the originals:** the Python Greenhouse source fetches with
`content=false` (title only, **no JD body**). Every AI feature needs the JD text, so the TS
scrapers must pull **full JD content** (Greenhouse `content=true`, equivalents for Lever/Ashby)
and store it as `Job.rawJd`.

Flow: worker scraper run → `ingest` queue upserts into `Job` → enqueues `normalize` → `score`
per new job. (LinkedIn/Naukri/NextHire from JobAlert are out of scope for v1 — the three ATS
feeds are the clean, reliable, high-signal set.)

---

## 6. AI design (grounded in the current Claude API)

**Models — tiered on purpose (a good interview talking point):**

| Job                                                        | Model              | Why                                                          |
| ---------------------------------------------------------- | ------------------ | ------------------------------------------------------------ |
| F2 JD normalization (high volume, structured)              | `claude-haiku-4-5` | cheap, fast, schema-constrained extraction; hundreds of JDs  |
| F3 fit score (judgment, moderate volume)                   | `claude-sonnet-5`  | needs reasoning about résumé↔JD fit; cost-sensible at volume |
| F4 tailoring / cover letter (low volume, quality-critical) | `claude-opus-4-8`  | the flagship writing; only runs when he clicks "tailor"      |

> The Anthropic guidance is "default to `claude-opus-4-8` unless you deliberately choose
> otherwise." The tiering above **is** a deliberate cost choice for a self-funded project —
> worth stating in the README exactly this way. If we'd rather keep it dead simple, use
> `claude-opus-4-8` everywhere and revisit cost later.

**Implementation notes (from the claude-api skill):**

- Use the official **`@anthropic-ai/sdk`** (TypeScript) in the worker — never raw fetch.
- **Structured outputs** for F2/F3: `output_config: { format: { type: "json_schema", schema } }`
  (or the SDK `messages.parse()` helper with a zod schema) so extraction/scoring returns
  validated JSON. Schemas live in `packages/core`.
- **Adaptive thinking** (`thinking: { type: "adaptive" }`) for the fit-score reasoning.
- **Prompt caching**: the résumé is the stable prefix across every fit-score call — cache it
  so repeated scoring is ~90% cheaper. Great, concrete efficiency line for the résumé.
- Keep the `ANTHROPIC_API_KEY` server-side only (in the worker), never in the Next.js client.

**Fit score = LLM-judge, not embeddings (recommended for v1).** Claude reads (cached résumé +
JD) and returns `{ score, matchedSkills[], gaps[], rationale }` via structured output. This is
single-provider (Anthropic only), simpler, and already a strong "AI feature" story.

> **Embeddings/RAG caveat.** A pgvector similarity pre-filter is a nice Phase-2 add and lets
> him say "RAG" honestly — **but Anthropic has no embeddings API**, so it needs a second
> provider (Voyage AI, Anthropic's recommended embeddings partner) or a local model
> (`sentence-transformers`). Decision deferred; not needed for a compelling v1.

---

## 7. Frontend (earns the FE / full-stack lines)

- Next.js App Router + TypeScript + Tailwind + React Query (server-state/caching).
- **Complex UI to show off:** dashboard with fit-score cards, filter/sort, a résumé-vs-JD
  match view (matched skills highlighted, gaps flagged), saved-jobs **kanban** (drag-drop),
  applied-status tracking.
- **Perf story:** virtualize the long job list (`@tanstack/react-virtual`), code-split heavy
  views, optimize images/fonts → capture a **Lighthouse before/after** (LCP/CLS/INP) for the
  README and the résumé bullet.
- **a11y:** keyboard-navigable, WCAG-AA color contrast, semantic landmarks.
- **Real-time (F6):** WebSocket (or SSE) channel pushes new high-fit jobs → toast + list prepend.

---

## 8. Testing & quality

- **Unit (Vitest):** the fit-score prompt-builder, JD normalization parsing, dedup/upsert
  logic — the pure functions worth testing.
- **Component (React Testing Library):** match view, kanban interactions.
- Optional **E2E (Playwright):** ingest→score→appears-on-dashboard happy path.
- This is what converts the résumé's "Testing (Jest/RTL)" keyword into something real.

---

## 9. Deployment

- **apps/web** → Vercel (live URL).
- **apps/worker + Redis + Postgres** → Railway or Render (managed Postgres + Redis add-ons).
- Ingestion (Python) runs as a scheduled job on the same host as the worker (cron/Railway
  scheduler), or the worker spawns it.
- GitHub Actions: typecheck + test + lint on PR (he already lists GitHub Actions — make it true here).

---

## 10. Milestones (suggested build order)

1. **M0 — scaffold** (½ wk): pnpm workspace, Next.js app, Prisma schema + migration, Postgres
   - Redis running locally (docker-compose), CI skeleton. _Deploy a hello-world to Vercel day one._
2. **M1 — ingest** (1 wk): port the 3 ATS scrapers to TS with full JD text; worker `ingest`
   queue; jobs land in Postgres; basic list view in the UI (real data on screen fast).
3. **M2 — AI core** (1 wk): F2 normalization + F3 fit score with structured outputs + résumé
   caching; scores render on job cards.
4. **M3 — product UI** (1 wk): filters, match view, kanban, applied tracking; React Query wiring.
5. **M4 — real-time + tailoring** (½–1 wk): WebSocket new-match push (F6); F4 tailoring on demand.
6. **M5 — perf + tests + polish** (½–1 wk): virtualization, Lighthouse before/after, Vitest/RTL
   suite, README with résumé-bullet mapping, deploy worker + DB, final live URL.

~4–6 focused weeks. Résumé-ready the moment M3 is live + deployed (real AI + real URL); M4–M5
add the WebSocket/perf/testing bullets.

---

## 11. Résumé bullets this unlocks (target copy)

- _Built an AI job-search platform (Next.js + TypeScript, Node worker, PostgreSQL, Redis) that
  scores résumé–JD fit via Claude with structured outputs and prompt caching (~90% cheaper
  repeat scoring), and drafts tailored outreach._
- _Designed an async ingestion pipeline on BullMQ/Redis processing N job postings/day with
  dedup and retry; real-time high-fit matches pushed to the client over WebSockets._
- _Cut dashboard LCP Xs→Ys (Lighthouse) via list virtualization, code-splitting, and caching;
  WCAG-AA accessible._
- _Live at <url> · code at <github>._ ← the line that fixes the "nothing verifiable" gap.

---

## 12. Decisions — resolved (2026-07-11)

1. **Model cost strategy** → **tiered** (Haiku extract / Sonnet score / Opus tailor). §6.
2. **Fit scoring** → **LLM-judge only** for v1; pgvector embeddings deferred to Phase 2. §6.
3. **Scrapers** → **ported to TypeScript** in the worker; no Python; single-language repo. §5.
4. **API style** → **REST** route handlers + React Query; GraphQL out of scope for v1. §3/§7.

```

```
