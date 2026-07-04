import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * `'unsafe-inline'` on script/style is required by Next.js' own hydration script and by Radix
 * components that set inline positioning styles — this is a baseline hardening pass, not a
 * nonce-based CSP. `'unsafe-eval'` is dropped in production; dev needs it for Fast Refresh.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  // `avatars.githubusercontent.com` — the seeded mock dataset's teammate avatars (faker.image.avatarGitHub()).
  "img-src 'self' data: https://avatars.githubusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" }
];

export default {
  experimental: {
    optimizePackageImports: ["@szum-tech/design-system"]
  },
  async headers() {
    return [
      {
        headers: securityHeaders,
        source: "/:path*"
      }
    ];
  },
  logging: {
    browserToTerminal: true
  },
  output: "standalone",
  productionBrowserSourceMaps: false,
  reactCompiler: true,
  reactStrictMode: true,
  async rewrites() {
    return [
      { destination: "/api/health", source: "/healthz" },
      { destination: "/api/health", source: "/api/healthz" },
      { destination: "/api/health", source: "/health" },
      { destination: "/api/health", source: "/ping" }
    ];
  }
} satisfies NextConfig;
