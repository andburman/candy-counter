import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Explicitly set the project root to avoid confusion with lockfiles in parent directories
  experimental: {
    turbo: {
      root: process.cwd(),
    },
  },
};

export default nextConfig;
