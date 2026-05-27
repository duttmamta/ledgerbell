import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/coming-soon.html',
      },
    ]
  },
};

export default nextConfig;
