import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' http://localhost:3000 https://teamradar-walerimoretz-lang-walerimoretz-langs-projects.vercel.app https://*.vercel.app",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
