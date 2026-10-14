import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.aliyuncs.com" },
      { protocol: "https", hostname: "cf.cjdropshipping.com" },
      { protocol: "https", hostname: "**.cjdropshipping.com" },
    ],
  },
};

export default nextConfig;
