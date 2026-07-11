import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@jobpilot/core", "@jobpilot/db"],
  // Don't bundle Prisma's native client on the server.
  serverExternalPackages: ["@prisma/client"],
  // Monorepo on Vercel: trace from the repo root and force the Prisma query-engine
  // binary into the serverless bundle (fixes "Query Engine not found").
  outputFileTracingRoot: path.join(dir, "../../"),
  outputFileTracingIncludes: {
    "/api/**": [
      "../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/*.node",
    ],
  },
};

export default nextConfig;
