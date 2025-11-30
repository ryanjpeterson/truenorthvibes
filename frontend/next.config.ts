import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  images: {
    dangerouslyAllowLocalIP: true,
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
        hostname: 'backend',
        port: '1337',
        pathname: '/uploads/**',
      },
      // Add your production domain
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SITE_URL 
          ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname 
          : 'localhost', // 
        port: '',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;