import type { NextConfig } from "next";
import "./lib/env";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
    experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "*.inc1.devtunnels.ms",
      ],
    },
  },
};

export default nextConfig;
