import { resolve } from 'node:path';
import { defineConfig } from 'tsup';

// One CommonJS bundle. Shared domain code is bundled in; the Firebase SDKs
// stay external and are installed by the Functions build from package.json.
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['cjs'],
  target: 'node20',
  platform: 'node',
  outDir: 'lib',
  clean: true,
  sourcemap: true,
  external: ['firebase-admin', 'firebase-functions', 'zod'],
  noExternal: ['@basis/shared'],
  esbuildOptions(options) {
    options.alias = { '@basis/shared': resolve(__dirname, '../packages/shared/src/index.ts') };
  },
});
