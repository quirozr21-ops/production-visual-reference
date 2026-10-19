import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.150"],
  poweredByHeader: false,
  experimental: {
    proxyClientMaxBodySize: "48mb",
    serverActions: {
      bodySizeLimit: "48mb",
    },
  },
};

export default nextConfig;
