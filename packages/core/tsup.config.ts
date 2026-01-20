import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: [
    '@shinobi-cash/constants',
    '@shinobi-cash/data',
    'poseidon-lite',
    'snarkjs',
    '@zk-kit/lean-imt',
    'ethers',
    'bip39',
    'viem',
  ],
});
