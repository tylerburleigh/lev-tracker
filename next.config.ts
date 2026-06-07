import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://minipc:3001", "http://127.0.0.1:3001", "http://0.0.0.0:3001"],
  devIndicators: false
};

export default nextConfig;
