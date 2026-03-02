import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/relayer/index.ts',
    'src/actions/deposit.ts',
    'src/actions/crosschain-deposit.ts',
    'src/actions/withdrawal.ts',
    'src/actions/crosschain-withdrawal.ts',
  ],
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    '@shinobi-cash/core',
    /^@shinobi-cash\/core\//,
    '@shinobi-cash/constants',
    '@shinobi-cash/data',
    'viem',
    /^viem\//,
    'permissionless',
    /^permissionless\//,
  ],
});
