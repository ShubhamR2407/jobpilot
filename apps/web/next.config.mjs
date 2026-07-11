/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@jobpilot/core", "@jobpilot/db"],
  // Don't bundle Prisma's native client on the server.
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
