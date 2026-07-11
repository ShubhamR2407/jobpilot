# JobPilot — Learning & Understanding Guide

The goal of this doc is **understanding**, not memorizing. For each piece of the stack:
**What it is · Why we chose it (vs alternatives) · How it's used in JobPilot · Questions to test yourself.**

If you can answer the questions in your own words *and explain the "why"*, you can handle any
interviewer. Pair this with [INTERVIEW.md](./INTERVIEW.md) (the concise Q&A) and the actual code.

---

# Part 1 — The Story (tell this in 2 minutes)

**The problem.** My best work is private company code a recruiter can't see, and my only public
project was a college group app on someone else's GitHub. In 2026 hiring, a live demo + clean
GitHub is the single biggest shortlisting signal — so I built one, end to end.

**What it does.** JobPilot scrapes software jobs from company ATS feeds (Greenhouse/Lever/Ashby),
uses an LLM to score how well each fits my résumé — with a written rationale and matched/gap
skills — lets me filter/save/track them on a board, and drafts tailored application material on
demand.

**The arc of decisions (this is what interviewers care about):**
1. **Reuse over rebuild** — I had a Python side-project (JobAlert) that scraped these feeds. I
   ported the scrapers to TypeScript so the whole stack is one language.
2. **Only score *new* jobs** — scoring every job with an LLM costs money. I detect newly-posted
   jobs and score only those, so it runs at cents/day instead of dollars.
3. **Tier the models** — cheap model for mechanical extraction, mid model for judgment (scoring),
   top model only for writing (tailoring). Cost/quality matched to the task.
4. **Free, serverless hosting** — Vercel (frontend) + Neon (Postgres) + a scheduled GitHub Action
   (scraping/scoring). No always-on server, $0/month.
5. **Deliberate simplicity** — I chose polling over WebSockets and a cron over an always-on worker
   because the update cadence is gated upstream (jobs change every ~15 min); the simpler option is
   sufficient and cheaper.

**The hard parts** were deployment bugs — the biggest was Prisma's query engine not being bundled
into Vercel's serverless functions, which made the live site silently show nothing. (Part 4.)

---

# Part 2 — The stack, concept by concept

## 1. Monorepo (pnpm workspaces)

**What:** one repository holding multiple packages — `apps/web`, `apps/worker`, `packages/db`,
`packages/core` — linked so they can import each other as `@jobpilot/db` etc.

**Why:** the frontend and the worker share types (a `Job` shape) and the database client. In
separate repos you'd publish packages and juggle versions. A monorepo keeps them in lockstep —
one `pnpm install`, one type-check, atomic changes across the stack.

**How here:** `pnpm-workspace.yaml` lists `apps/*` and `packages/*`. `packages/core` holds pure,
shared functions (job matching), `packages/db` holds the Prisma client. Both apps depend on them
via `workspace:*`.

**Test yourself:**
- What problem does a monorepo solve that multi-repo doesn't? What's the cost?
- What does `workspace:*` mean in a package.json dependency?
- Why is `packages/core` kept free of I/O (no DB, no network)?

## 2. TypeScript

**What:** JavaScript with static types checked at build time.

**Why:** catches whole classes of bugs before runtime (wrong shapes, null access), and makes
refactoring safe. End-to-end TS means the same `Job` type flows from the scraper to the DB to the
API to the React component.

**How here:** every package is TS; `pnpm typecheck` runs `tsc --noEmit` across all of them; CI
fails if types break. `noUncheckedIndexedAccess` is on, so array access is `T | undefined` (why
you'll see `jobs[i]!` or a guard).

**Test yourself:**
- What's the difference between a type error and a runtime error? Which does TS prevent?
- What does `tsc --noEmit` do?
- Why does `arr[i]` have type `T | undefined` under `noUncheckedIndexedAccess`?

## 3. Next.js (App Router)

**What:** a React framework. The **App Router** uses a `app/` folder where files map to routes;
components are **Server Components** by default and run on the server, unless marked
`"use client"`.

**Why:** one framework for the UI *and* the backend (API route handlers), server rendering for
speed/SEO, and a clean file-based structure. Deploys to Vercel with zero config.

**How here:**
- Pages like `app/page.tsx` are marked `"use client"` because they use hooks (React Query,
  useState) and interactivity.
- **Route handlers** (`app/api/jobs/route.ts`) are the REST backend — they run on the server
  (Node runtime), talk to Postgres via Prisma, and return JSON.
- `export const dynamic = "force-dynamic"` tells Next *not* to pre-render at build time (there's
  no DB during a build) — the route runs fresh on each request.

**Test yourself:**
- Server Component vs Client Component — what runs where, and how do you opt into a client one?
- Why does the dashboard need `"use client"` but the API route doesn't?
- What does `force-dynamic` prevent, and why do we need it here?
- Why does the browser never import Prisma directly in this app?

## 4. React Query (`@tanstack/react-query`)

**What:** a library for **server state** — fetching, caching, and updating data from an API. You
give it a `queryKey` + a fetch function; it caches by key, dedupes, refetches, and exposes
`isLoading`/`data`/`error`.

**Why:** without it you hand-roll `useEffect` + `useState` + loading flags + cache + refetch +
optimistic updates and get them subtly wrong. React Query gives all of that as primitives.

**How here:**
- `useQuery({ queryKey: ["jobs", filters], queryFn })` — refetches automatically when filters
  change (the key changes).
- `refetchInterval: 60_000` — the dashboard **polls** every 60s so newly-scored jobs appear
  without a manual reload (our "live updates").
- **Optimistic mutations** on the kanban: on drag, `onMutate` updates the cache *immediately*
  (`setQueryData`), and `onError` rolls back — the UI feels instant, and reconciles with the
  server on `onSettled` via `invalidateQueries`.

**Test yourself:**
- What is "server state" and why is it different from local UI state?
- What does the `queryKey` do? What happens when it changes?
- Walk through an optimistic update: onMutate → onError → onSettled. What is each for?
- What's the difference between `invalidateQueries` and `setQueryData`?

## 5. Node.js worker & async processing

**What:** a long-running Node process (`apps/worker`) separate from the web app, for background
work (scraping, scoring).

**Why:** scraping ~70 feeds and calling an LLM is slow and shouldn't block a web request. Doing it
in a separate worker keeps the API fast and lets the work be retried/scheduled.

**How here:** the worker runs the scrapers, upserts jobs, and calls the AI pipeline. Locally it's
a BullMQ queue worker; in prod the same logic runs from a scheduled GitHub Action.

**Test yourself:**
- Why not do the scraping inside an API request handler?
- What does "async" actually buy you here (I/O-bound vs CPU-bound work)?

## 6. BullMQ + Redis

**What:** **Redis** is an in-memory data store; **BullMQ** is a job-queue library built on Redis.
You `add` jobs to a queue; a `Worker` pulls and processes them, with retries and concurrency.

**Why:** decouples "find jobs" from "score jobs." If scoring is slow or fails, jobs wait in the
queue and retry; you control concurrency; you can schedule repeatable jobs. It's the standard
"fan work out to background workers" pattern.

**How here (be precise — this matters):** locally, the worker defines two queues (`ingest`,
`score`) on Redis; ingest enqueues a score job per new posting; the score worker runs at
concurrency 3; a repeatable job polls every 5 min. **In production I did NOT use BullMQ/Redis** —
the free serverless deploy has no always-on server to host them, so a scheduled GitHub Action runs
the same ingest+score logic directly (`poll-once`). *That local-vs-prod split is a deliberate
choice, and a great interview answer.*

**Test yourself:**
- What is Redis, and why is a queue built on it (vs a DB table)?
- What does a message queue give you that a direct function call doesn't? (retries, concurrency,
  decoupling, scheduling)
- Why does BullMQ need `maxRetriesPerRequest: null` on the connection?
- Is Redis running in your production deploy? (Answer: no — explain why, and what runs instead.)

## 7. PostgreSQL + Prisma

**What:** **PostgreSQL** is a relational (SQL) database. **Prisma** is a TypeScript ORM — you
define models in a schema, it generates a typed client and manages migrations.

**Why:** the data is relational (a Job has one FitScore, one Enrichment, one Application). Prisma
gives type-safe queries (autocomplete, compile-time checks), painless migrations, and no
hand-written SQL for the common cases.

**How here:**
- `schema.prisma` defines `Job`, `JobEnrichment`, `FitScore`, `Resume`, `Application`.
- **Dedup:** `@@unique([source, sourceJobId])` + `prisma.job.upsert()` — re-scraping never inserts
  a duplicate.
- **Relations:** 1:1 from Job to Enrichment/FitScore/Application, so a job can exist *before* it's
  scored, and scoring is a separate optional row.
- **Migrations:** `prisma migrate dev` (local, creates migration files) / `migrate deploy` (prod).

**Test yourself:**
- What is an ORM, and what does Prisma generate from the schema?
- What's an `upsert`, and how does the unique constraint make dedup work?
- Why separate `FitScore` into its own table instead of columns on `Job`?
- Difference between `migrate dev` and `migrate deploy`?
- What is a database index, and why is `@@index([ingestedAt])` there?

## 8. The scrapers (HTTP + REST)

**What:** functions that fetch JSON from public ATS APIs and map it to our `Job` shape.

**Why:** ATS feeds (Greenhouse/Lever/Ashby) are public JSON and update the instant a job is
posted — faster and more reliable than scraping LinkedIn HTML.

**How here:** `fetch(url)` with a browser User-Agent + a 20s `AbortSignal.timeout`; Greenhouse
needs `?content=true` for the full JD; results run through pure filters (title keyword, location,
experience cap) from `packages/core`. `Promise.allSettled` so one bad feed doesn't sink the run.

**Test yourself:**
- What's a REST API? What does an HTTP GET return here?
- Why `Promise.allSettled` instead of `Promise.all`?
- What's a User-Agent header and why set it?
- Where does filtering happen, and why are those functions "pure"?

## 9. LLM integration (Anthropic API) — the differentiator

**What:** calling a large language model (Claude) via the official SDK to extract fields, score
fit, and write tailored text.

**Why & how — the concepts to really understand:**
- **Tokens & cost:** models bill per input/output token. That's *why* cost control matters and
  why we tier models.
- **Tiered models:** `claude-haiku-4-5` (cheap) for mechanical JD extraction; `claude-sonnet-5`
  (mid) for scoring judgment; `claude-opus-4-8` (top) only for on-demand writing. Match model
  power to task difficulty.
- **Structured outputs:** `output_config.format` with a JSON schema forces the model to return
  valid JSON matching your shape — no fragile string parsing.
- **Prompt caching:** the résumé + rubric are a cached system prefix; scoring many jobs reuses
  that cached prefix at ~10% of the token cost — hence "~90% cheaper repeat scoring."
- **LLM-as-judge vs embeddings:** we let Claude read (résumé, JD) and *judge* fit with a rationale,
  rather than compare vector embeddings. Simpler, single-provider, and the rationale is a feature.
  Embeddings would be a scale-time pre-filter.
- **Score only new jobs:** the biggest cost lever — never re-score the backlog.

**Test yourself:**
- What's a token? How does token count drive cost?
- Why use Haiku for extraction but Sonnet for scoring? Why is Opus reserved for tailoring?
- What do structured outputs guarantee, and what do they replace?
- Explain prompt caching — what's cached, and why is it ~90% cheaper on repeats?
- LLM-judge vs embeddings/RAG — what's the tradeoff, and why did you pick judge?
- What stops the tailoring from inventing experience you don't have?

## 10. Deployment (Vercel · Neon · GitHub Actions)

**What:** **Vercel** hosts the Next.js app as serverless functions; **Neon** is managed serverless
Postgres; a **GitHub Action** runs on a cron to scrape + score.

**Why:** all free, no server to maintain. Serverless = you don't run/patch a machine; it scales to
zero when idle.

**How here:**
- Push to `main` → Vercel builds & deploys the web app.
- `.github/workflows/poll.yml` runs every ~15 min → `poll-once` against Neon (secrets:
  `DATABASE_URL`, `ANTHROPIC_API_KEY`).
- Secrets live in GitHub Actions secrets + Vercel env vars — never committed.

**Test yourself:**
- What does "serverless" mean, and what's the tradeoff vs an always-on server?
- Why a cron/GitHub Action instead of hosting the BullMQ worker?
- Where do secrets live, and why never in the repo?
- What's a cold start (and how did Neon's scale-to-zero show up as a bug)?

## 11. Testing (Vitest)

**What:** **Vitest** is a fast test runner; we unit-test the pure matching functions.

**Why:** the matching helpers (does a title match? is this location India-eligible?) are pure
functions — same input, same output, no I/O — so they're cheap to test and catch regressions.
That's *why* we kept them pure in `packages/core`.

**How here:** `packages/core/src/matching.test.ts` (15 tests); `pnpm test` runs in CI.

**Test yourself:**
- What's a unit test? What makes a function easy to unit-test?
- Why test the matching helpers but not the scrapers (which do network I/O)?
- What's the difference between unit, integration, and E2E tests?

## 12. Performance (list virtualization, Core Web Vitals)

**What:** **Virtualization** renders only the visible rows of a long list (via
`@tanstack/react-virtual`), not all of them. **Core Web Vitals** (LCP, CLS, INP) are Google's UX
metrics.

**Why:** a 300-item list of rich cards is a lot of DOM; rendering only what's on screen keeps it
fast (better INP/LCP).

**How here:** `components/JobList.tsx` uses a window virtualizer with dynamic measurement (cards
are variable-height). Capture real numbers with `npx lighthouse <url> --view`.

**Test yourself:**
- What does virtualization actually do to the DOM, and why is it faster?
- What are LCP, CLS, INP — roughly what does each measure?
- Why is variable-height virtualization harder than fixed-height?

---

# Part 3 — The cross-cutting decisions (know these cold)

Interviewers love "why did you choose X over Y." Each of these is a real decision you made:

| Decision | Chose | Over | Because |
|---|---|---|---|
| Real-time | **60s polling** | WebSockets | Updates gated by a 15-min cron — push adds complexity for no benefit, needs an always-on server |
| Prod worker | **Scheduled cron** | Always-on BullMQ worker | Free serverless has no always-on server; a single-user app doesn't need one |
| Fit scoring | **LLM-judge** | Embeddings/RAG | Single provider, simpler, rationale is a feature; embeddings = scale-time pre-filter |
| Scoring scope | **New jobs only** | Score everything | Cost — the backlog is stale and expensive to re-score |
| Model per task | **Tiered (Haiku/Sonnet/Opus)** | One model everywhere | Match cost to task difficulty |
| API style | **REST route handlers** | GraphQL | Simpler, sufficient for this surface |

---

# Part 4 — The hard bugs (your "tell me about a challenging bug" stories)

Practice each as: **symptom → how you investigated → root cause → fix → lesson.**

1. **Live site silently empty.** Worked locally + in the GitHub Action, not on Vercel; the API
   returned `[]`. I added a temporary debug flag to surface the swallowed error:
   *"Prisma Client could not locate the Query Engine for runtime rhel-openssl-3.0.x."* **Root
   cause:** in a pnpm monorepo, Next's bundler didn't ship Prisma's Linux query-engine binary into
   the serverless function. **Fix:** `binaryTargets` in the schema + `outputFileTracing` in
   next.config. **Lesson:** a catch block was hiding the real error — always surface it while
   debugging.
2. **Scheduled scoring crashed.** Scored ~18 jobs then exited 1: `Unterminated string in JSON`.
   **Root cause:** `max_tokens` too low truncated a verbose LLM response → invalid JSON → one bad
   job killed the whole loop. **Fix:** raised `max_tokens` + wrapped per-job scoring in try/catch.
   **Lesson:** bound outputs, and isolate per-item failures in a batch.
3. **Two ioredis versions** made the worker not type-check. **Fix:** pass connection *options* to
   BullMQ instead of an instance → one version in the tree.
4. **Neon cold start** — free-tier Postgres scales to zero; the first connection after idle can
   fail. Context for bug #1's red herrings.

---

# Part 5 — How to study this

1. **Read Part 1 aloud** until the story flows in ~2 minutes without notes.
2. For each Part 2 section, **answer the "Test yourself" questions out loud in your own words.**
   If you stumble, open the referenced file and read the code, then try again.
3. **Open the actual code** while studying — every claim here maps to a file (see the table in
   [README.md](./README.md)).
4. Practice the **Part 4 bug stories** — these are the highest-signal interview moments.
5. When ready, do a **mock interview** (ask me — I'll play interviewer and grade your answers).

The test of real understanding: can you explain **why** you chose each thing, and what you'd do
differently at 100× the scale? If yes, you own this project.
