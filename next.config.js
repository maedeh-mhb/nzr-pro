/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'theherbalistsassistant.store',
      },
      {
        protocol: 'https',
        hostname: 'dawntoduskalchemy.co.uk',
      },
      {
        protocol: 'https',
        hostname: '*.uupload.ir',
      },
    ],
    
  },
  async redirects() {
    return [
      {
        source: '/journal',
        destination: '/how-to-use',
        permanent: true,
      },
      {
        source: '/journal/:slug',
        destination: '/how-to-use/:slug',
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig
