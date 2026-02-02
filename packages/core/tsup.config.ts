import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    auth: 'src/auth/index.ts',
    deposit: 'src/deposit/index.ts',
    withdrawal: 'src/withdrawal/index.ts',
    discovery: 'src/discovery/index.ts',
    'discovery-v2': 'src/discovery-v2/index.ts',
    proof: 'src/proof/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: {
    resolve: ['@shinobi-cash/constants', '@shinobi-cash/data'],
  },
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
