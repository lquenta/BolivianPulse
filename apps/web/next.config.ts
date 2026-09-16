import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@bo-dash/shared", "@bo-dash/ingest"],
  serverExternalPackages: ["ioredis", "pg"],
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
