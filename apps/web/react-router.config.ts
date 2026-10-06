import type { Config } from '@react-router/dev/config';
import { sitePaths } from './app/site/catalog';

// No server. Every route is written as static HTML at build time and served
// by Firebase Hosting; the catalog decides the paths to prerender.
export default {
  ssr: false,
  prerender: () => sitePaths(),
} satisfies Config;
