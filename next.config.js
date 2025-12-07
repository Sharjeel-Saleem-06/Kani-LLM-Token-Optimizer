/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { dev, isServer }) => {
    // Reduce cache issues on Windows
    if (process.platform === 'win32') {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
      
      // Disable cache if causing issues
      config.cache = {
        type: 'memory'
      };
    }
    
    return config;
  }
}

module.exports = nextConfig 