import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/_next/image',
        headers: [{ key: 'Content-Disposition', value: 'inline' }],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/companies', destination: '/company', permanent: true },
      { source: '/companies/:id', destination: '/company/:id', permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.acnnewswire.com',
        port: '',
        pathname: '/images/company/**', // This matches your image path!
        search: '',
      },
      // Add other domains you might need
      {
        protocol: 'https',
        hostname: 'photos.acnnewswire.com',
        port: '',
        pathname: '/**',
        search: '',
      },
    ],
  },
};

export default nextConfig;
