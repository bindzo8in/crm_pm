import type { NextConfig } from "next";
import "./lib/env";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
  allowedDevOrigins: ['192.168.1.5', "jh5lsv74-3000.inc1.devtunnels.ms", '192.168.1.3', '172.24.128.1'],
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
  },
  output: "standalone",
};

export default nextConfig;
