/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@shinobi-cash/data", "@shinobi-cash/constants"],
};

export default nextConfig;
