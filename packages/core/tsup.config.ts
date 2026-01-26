import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    zk: 'src/zk.ts',
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
    /^poseidon-lite\//,
    'snarkjs',
    '@zk-kit/lean-imt',
    'bip39',
    'viem',
  ],
});
