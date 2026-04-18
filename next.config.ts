import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb', // allow video uploads up to 100MB through the proxy
    },
  },
};

export default nextConfig;
