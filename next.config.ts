import type { NextConfig } from "next";

const githubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(githubPages
    ? {
        output: "export" as const,
        basePath: "/Dashboard-CJ",
        trailingSlash: true,
      }
    : {}),
  images: {
    unoptimized: githubPages,
    remotePatterns: [
      { protocol: "https", hostname: "**.aliyuncs.com" },
      { protocol: "https", hostname: "cf.cjdropshipping.com" },
      { protocol: "https", hostname: "**.cjdropshipping.com" },
    ],
  },
};

export default nextConfig;
