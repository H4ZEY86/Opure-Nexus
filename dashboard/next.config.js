/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    forceSwcTransforms: true,
  },
  typescript: {
    // RTX 5070 Ti optimization: Faster builds
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    // Three.js optimization for RTX 5070 Ti  
    config.externals = config.externals || {};
    if (!isServer) {
      config.externals.three = 'three';
    }
    
    return config;
  },
  // Performance optimization
  poweredByHeader: false,
  compress: true,
  // Real-time features
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig