/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    return {
      // afterFiles: checked after filesystem routes — auth API routes take priority
      afterFiles: [
        {
          source: '/api/species/:path*',
          destination: `${process.env.API_INTERNAL_URL || 'http://localhost:3001'}/api/species/:path*`,
        },
      ],
    };
  },
};

module.exports = nextConfig;
