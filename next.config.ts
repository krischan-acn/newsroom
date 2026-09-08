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
      // /companies/<id> -> /company/<id> is the real rename and works.
      { source: '/companies/:id', destination: '/company/:id', permanent: true },

      // The bare /companies used to redirect to /company, but no /company
      // index page has ever existed - so it 308'd straight into a 404. There is
      // no company directory to send people to either (the API has no company
      // list the frontend can page, gap CO-04), so both land on the homepage
      // until one is built. Repoint these at /company once it exists.
      { source: '/companies', destination: '/', permanent: false },
      { source: '/company', destination: '/', permanent: false },
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
