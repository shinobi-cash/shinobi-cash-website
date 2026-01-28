import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@shinobi-cash/data", "@shinobi-cash/constants", "@shinobi-cash/core"],
  webpack: (config, { webpack }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')

    // Stub React Native modules used by MetaMask SDK (not needed for web)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    }

    // Suppress critical dependency warning from snarkjs/ffjavascript web-worker
    config.plugins.push(
      new webpack.ContextReplacementPlugin(
        /web-worker/,
        (data) => {
          delete data.dependencies[0].critical;
          return data;
        }
      )
    );

    return config
  }
};

export default withBundleAnalyzer(nextConfig);
