import type { NextConfig } from "next";
import "./lib/env";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
  allowedDevOrigins: ['192.168.1.5',"jh5lsv74-3000.inc1.devtunnels.ms",],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    agentUpgrade: "security",
    serverActions: {
      allowedOrigins: [
        "jh5lsv74-3000.inc1.devtunnels.ms",
      ],
    },
  },
  output: "standalone",
};

export default nextConfig;
