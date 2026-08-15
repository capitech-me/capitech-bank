import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@capitech/ui", "@capitech/db", "@capitech/lib"],
};

export default nextConfig;
