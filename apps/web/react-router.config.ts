import type { Config } from '@react-router/dev/config';

// No server. Every route is written as static HTML at build time and served
// by Firebase Hosting; the published catalog decides the paths to prerender.
export default {
  ssr: false,
  prerender: true,
} satisfies Config;
