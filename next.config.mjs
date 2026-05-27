/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
    unoptimized: true,
  },
  turbopack: {
    root: '/Users/ridloabelian/Github/prodig',
  },
}

export default nextConfig
