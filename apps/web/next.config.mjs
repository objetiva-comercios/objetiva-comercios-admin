import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@objetiva/ui'],
  experimental: {
    // Enable turbopack for faster dev
  },
}

export default withBundleAnalyzer(nextConfig)
