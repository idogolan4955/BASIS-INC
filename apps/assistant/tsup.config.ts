import { resolve } from 'node:path';
import { defineConfig } from 'tsup';

// One ESM file; @basis/shared is bundled in so the server runs from anywhere.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  noExternal: ['@basis/shared'],
  banner: { js: '#!/usr/bin/env node' },
  esbuildOptions(options) {
    options.alias = { '@basis/shared': resolve(__dirname, '../../packages/shared/src/index.ts') };
  },
});
