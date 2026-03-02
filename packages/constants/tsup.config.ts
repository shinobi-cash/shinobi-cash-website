import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/chains.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: ["viem", /^viem\//],
});
