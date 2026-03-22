import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["lh3.googleusercontent.com"], // Allow Google avatar image domains
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
        // resolve specific node modules for react-pdf/renderer or similar if needed in client
        config.resolve.alias = {
            ...config.resolve.alias,
        };
    }
    return config;
  },
};

export default nextConfig;
