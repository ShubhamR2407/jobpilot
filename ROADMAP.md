# JobPilot — Build Roadmap

Step-by-step plan. Each step = a checkpoint you can see and click. Résumé-ready at Step 4.
Pairs with [SPEC.md](./SPEC.md).

---

## Step 0 — Scaffold & deploy an empty shell · ~½ week

**Goal:** a running skeleton, deployed, so there's a live URL from day one.

**We build:**

- pnpm workspace monorepo: `apps/web` (Next.js + TS + Tailwind), `apps/worker`, `packages/db`, `packages/core`
- `docker-compose.yml` for local Postgres + Redis
- Prisma initialized (empty schema), connects to local Postgres
- GitHub repo + GitHub Actions CI (typecheck + lint on push)
- Deploy the empty Next.js app to Vercel

**You'll have:** a live URL showing a placeholder page; `pnpm dev` runs everything locally; green CI.

**Locks:** monorepo tooling, CI/CD, "deployed" — the foundation of the verifiable artifact.

---

## Step 1 — Ingest real jobs into a database · ~1 week

**Goal:** real jobs on screen, pulled and stored automatically.

**We build:**

- Port the 3 ATS scrapers (Greenhouse/Lever/Ashby) from JobAlert to TS in `apps/worker/src/scrapers/` — **fetching full JD text** (the `content=true` change)
- Prisma `Job` model + migration; dedup via `@@unique([source, sourceJobId])`
- Worker `ingest` BullMQ queue: scrape → upsert into Postgres
- Basic job-list page in the web app reading from the DB

**You'll have:** run the worker, watch real jobs land in Postgres and render in the browser.

**Locks:** TypeScript, async worker + BullMQ/Redis queue, PostgreSQL, data modeling.

---

## Step 2 — The AI core (the differentiator) · ~1 week

**Goal:** every job gets an AI fit score against your résumé.

**We build:**

- `Resume` model — your résumé stored as the thing jobs are scored against
- Worker `normalize` job (Haiku): LLM extracts structured JD fields via structured outputs
- Worker `score` job (Sonnet): LLM-judge returns `{ score, matchedSkills, gaps, rationale }` — with your résumé as a **cached prompt prefix** (~90% cheaper repeat scoring)
- `JobEnrichment` + `FitScore` models; scores render on the job cards

**You'll have:** jobs sorted by fit score, each with a written rationale and matched-skills/gaps.

**Locks:** LLM integration, structured outputs, prompt caching, the headline AI feature.

---

## Step 3 — The product UI · ~1 week ← résumé-ready after this + deploy

**Goal:** it looks and feels like a real product, not a demo.

**We build:**

- Dashboard: fit-score cards, filters (score/stack/location/remote), sort
- Résumé-vs-JD **match view** — matched skills highlighted, gaps flagged
- Saved-jobs **kanban** (drag-drop: Saved → Applied → Interview → Offer/Rejected)
- Applied-status tracking; React Query wiring for all server state
- Deploy the worker + managed Postgres + Redis (Railway/Render)

**You'll have:** a deployed, usable product you run for your own search — and the verifiable
live-URL + GitHub link your résumé has been missing.

**Locks:** React/Next depth, complex UI, state management, full end-to-end deployment.

---

## Step 4 — Real-time + AI tailoring · ~½–1 week

**Goal:** the "wow" features.

**We build:**

- WebSocket channel: new high-fit matches pushed live → toast + list prepend
- Worker `tailor` job (Opus, on demand): draft tailored résumé bullets / cover letter /
  recruiter outreach for a chosen job; save to `Application.tailoredDraft`

**You'll have:** live match notifications; one-click tailored outreach per job.

**Locks:** WebSockets, agentic "AI that does real work."

---

## Step 5 — Performance, tests, polish · ~½–1 week

**Goal:** the production-grade finish that survives a technical interview.

**We build:**

- Virtualize the long job list; code-split heavy views; optimize images/fonts
- **Lighthouse before/after** capture (LCP/CLS/INP) for README + résumé
- a11y pass (keyboard nav, WCAG-AA contrast, semantic landmarks)
- Vitest unit tests (scoring/normalization/dedup) + RTL component tests
- README that maps each résumé bullet → the code that backs it

**You'll have:** a polished, tested, fast, documented flagship.

**Locks:** Core Web Vitals story, testing (Vitest/RTL), a11y — the last of the prepped keywords.

---

## At the end

- Live URL + clean public GitHub repo, README mapping résumé bullets → code
- You use it daily for your own search
- Every prepped résumé keyword (Redis, WebSockets, LLM, TS, testing, Core Web Vitals) is now
  a real, verifiable thing you built — and you can speak to every decision in an interview.

**Total:** ~4–6 focused weeks. Résumé-ready the moment **Step 3** ships (real AI + live URL);
Steps 4–5 add the WebSocket/perf/testing bullets.
