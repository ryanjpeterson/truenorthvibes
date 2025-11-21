/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' is required for Docker deployments to keep the image size small
  output: "standalone",
  images: {
    // Keep unoptimized true to avoid issues with local/container IP resolution
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '1337',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'backend', // Allow internal docker hostname
        port: '1337',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;