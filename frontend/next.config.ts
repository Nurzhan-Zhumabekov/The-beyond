import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/login", destination: "/" },
        { source: "/register", destination: "/" },
        { source: "/auth/:path*", destination: "/" },
        { source: "/dashboard", destination: "/" },
        { source: "/projects", destination: "/" },
        { source: "/projects/:path*", destination: "/" },
        { source: "/history", destination: "/" }
      ]
    };
  }
};

export default nextConfig;
