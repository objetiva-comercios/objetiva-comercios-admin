/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@objetiva/ui'],
  experimental: {
    // Enable turbopack for faster dev
  },
}

export default nextConfig
