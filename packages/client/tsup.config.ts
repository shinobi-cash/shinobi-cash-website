import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    '@shinobi-cash/core',
    /^@shinobi-cash\/core\//,
    '@shinobi-cash/constants',
    'viem',
    /^viem\//,
    'permissionless',
    /^permissionless\//,
  ],
});
