# JobPilot

**Live demo:** https://jobpilot-web-kappa.vercel.app · **Repo:** https://github.com/ShubhamR2407/jobpilot

An AI job-search copilot — ingests jobs from company ATS feeds, scores each against your
résumé with an LLM, and drafts tailored outreach. See [SPEC.md](./SPEC.md) for the design and
[ROADMAP.md](./ROADMAP.md) for the build plan.

> **Build status:** Step 1 complete — ingests jobs from Greenhouse/Lever/Ashby into Postgres
> via a BullMQ/Redis worker, listed on the homepage. Next: Step 2 (AI fit scoring). See
> [ROADMAP.md](./ROADMAP.md). _(The Vercel demo shows an empty state until a cloud DB is
> provisioned in Step 3; run locally to see real jobs.)_

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
