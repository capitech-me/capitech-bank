import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Workspace packages ship TypeScript source — transpile them */
  transpilePackages: ["@capitech/ui", "@capitech/db", "@capitech/lib", "@capitech/email", "@capitech/openapi"],
};

export default nextConfig;
