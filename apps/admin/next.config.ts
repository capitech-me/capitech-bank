import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Multi-zone: this app is served at online.capitech.me/admin */
  basePath: "/admin",
  transpilePackages: ["@capitech/ui", "@capitech/db", "@capitech/lib", "@capitech/email", "@capitech/openapi"],

  /* S-8: Security headers for all routes (source is auto-prefixed with the /admin basePath) */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://hekufxbeigxzkyfsqalx.supabase.co https://www.alphavantage.co wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
