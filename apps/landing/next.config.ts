import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Workspace packages ship TypeScript source — transpile them */
  transpilePackages: ["@capitech/ui", "@capitech/db", "@capitech/lib"],
};

export default nextConfig;
