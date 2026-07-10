import { APP_NAME, APP_TAGLINE } from "@jobpilot/core";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-center text-neutral-100">
      <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs font-medium uppercase tracking-widest text-neutral-400">
        Step 0 · scaffold live
      </span>

      <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-6xl font-bold tracking-tight text-transparent">
        {APP_NAME}
      </h1>

      <p className="max-w-md text-lg text-neutral-400">{APP_TAGLINE}</p>

      <p className="max-w-md text-sm text-neutral-600">
        Next up (Step 1): ingest jobs from company ATS feeds into Postgres and
        list them here.
      </p>
    </main>
  );
}
