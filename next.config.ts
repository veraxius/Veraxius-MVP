import type { NextConfig } from "next";

function buildContentSecurityPolicy(): string {
  const apiUrl = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:3001"
  ).replace(/\/$/, "");

  const scriptSrc =
    process.env.NODE_ENV === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com"
      : "script-src 'self' 'unsafe-inline' https://accounts.google.com";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    `connect-src 'self' ${apiUrl} https://accounts.google.com ws: wss:`,
    "frame-src https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");
}

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: buildContentSecurityPolicy(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
