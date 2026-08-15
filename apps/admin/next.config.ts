import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Multi-zone: this app is served at online.capitech.me/admin */
  basePath: "/admin",
  transpilePackages: ["@capitech/ui", "@capitech/db", "@capitech/lib", "@capitech/email", "@capitech/openapi"],
};

export default nextConfig;
