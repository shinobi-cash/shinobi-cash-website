/** @type {import('next').NextConfig} */

const nextConfig = {
  transpilePackages: ["@workspace/ui", "@shinobi-cash/data", "@shinobi-cash/constants", "@shinobi-cash/core"],
  webpack: config => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  }
};

export default nextConfig;
