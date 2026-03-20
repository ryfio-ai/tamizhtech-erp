/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com'], // For Google Auth avatars
  },
  // Revalidation interval for caching
  experimental: {
    // next.js 14 specific
  }
};

export default nextConfig;
