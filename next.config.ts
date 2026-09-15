import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    proxyClientMaxBodySize: "16mb",
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
