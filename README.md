# JobPilot

**Live demo:** https://jobpilot-web-kappa.vercel.app · **Repo:** https://github.com/ShubhamR2407/jobpilot

An AI job-search copilot — ingests jobs from company ATS feeds, scores each against your
résumé with an LLM, and drafts tailored outreach. See [SPEC.md](./SPEC.md) for the design and
[ROADMAP.md](./ROADMAP.md) for the build plan.

> **Build status:** Step 4 complete — **live on Vercel** with a React Query dashboard (score /
> source / remote / country filters, sort, save), a drag-drop kanban board, and **on-demand
> Opus tailoring** (tailored résumé bullets + recruiter outreach per job). Backed by Neon
> Postgres; a scheduled GitHub Action ingests fresh ATS postings and AI-scores only new ones
> (Haiku extraction + Sonnet fit-scoring with a cached résumé prefix). Next: Step 5
> (perf/tests/polish). See [ROADMAP.md](./ROADMAP.md).

## Stack

TypeScript monorepo (pnpm workspaces):

- **`apps/web`** — Next.js (App Router) frontend + REST API + WebSocket endpoint
- **`apps/worker`** — Node worker: BullMQ queues, scrapers, Claude API calls
- **`packages/db`** — Prisma schema + shared client (PostgreSQL)
- **`packages/core`** — shared TypeScript types and schemas
- **Datastores** — PostgreSQL + Redis (via `docker-compose`)

## Quickstart

```bash
docker compose up -d        # start Postgres + Redis
cp .env.example .env
pnpm install                # also runs prisma generate (postinstall)
pnpm dev                    # web → http://localhost:3000
pnpm worker                 # (separate terminal) worker
```

## Scripts

| Command                              | What it does                  |
| ------------------------------------ | ----------------------------- |
| `pnpm dev`                           | Run the Next.js web app       |
| `pnpm worker`                        | Run the worker                |
| `pnpm build`                         | Build the web app             |
| `pnpm typecheck`                     | Typecheck all packages        |
| `pnpm lint` / `pnpm format`          | Prettier check / write        |
| `pnpm up` / `pnpm down`              | Start / stop Postgres + Redis |
| `pnpm db:migrate` / `pnpm db:studio` | Prisma migrate / studio       |
| `pnpm test`                          | Vitest unit tests             |

## Testing & performance

- **Unit tests** (`pnpm test`) — Vitest over the pure matching helpers in
  `packages/core` (`matching.test.ts`), run in CI.
- **Virtualized list** — the dashboard uses `@tanstack/react-virtual`
  (`components/JobList.tsx`), so only visible cards are in the DOM.
- **Lighthouse** — capture Core Web Vitals against the live site:
  ```bash
  npx lighthouse https://jobpilot-web-kappa.vercel.app --view
  ```

## Where each capability lives (résumé → code)

| Capability                                                          | Code                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------ |
| TypeScript monorepo                                                 | `pnpm-workspace.yaml`, `apps/*`, `packages/*`          |
| Async worker + queue (BullMQ/Redis)                                 | `apps/worker/src/queue.ts`, `index.ts`                 |
| PostgreSQL + Prisma (schema, migrations, dedup)                     | `packages/db/prisma/schema.prisma`                     |
| ATS scrapers (Greenhouse/Lever/Ashby)                               | `apps/worker/src/scrapers/`                            |
| LLM integration (tiered models, structured outputs, prompt caching) | `apps/worker/src/ai/`                                  |
| On-demand Opus tailoring                                            | `apps/web/app/api/jobs/[id]/tailor/route.ts`           |
| REST API + React Query                                              | `apps/web/app/api/`, `app/lib/jobs.ts`, `app/page.tsx` |
| Drag-drop kanban (optimistic updates)                               | `apps/web/app/board/page.tsx`                          |
| List virtualization                                                 | `apps/web/app/components/JobList.tsx`                  |
| Unit tests                                                          | `packages/core/src/matching.test.ts`                   |
| CI (typecheck · test · lint · build)                                | `.github/workflows/ci.yml`                             |
| Scheduled ingest+score (free, serverless)                           | `.github/workflows/poll.yml`                           |

See [INTERVIEW.md](./INTERVIEW.md) for the deep-dive study guide.
