import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    proxyClientMaxBodySize: "48mb",
    serverActions: {
      bodySizeLimit: "48mb",
    },
  },
};

export default nextConfig;
