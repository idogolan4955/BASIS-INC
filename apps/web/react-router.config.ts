import type { Config } from '@react-router/dev/config';
import { sitePaths } from './app/site/catalog';

// The site: no server. Every route is written as static HTML at build time and
// served by Firebase Hosting; the catalog decides the paths to prerender.
// The iPhone app (apps/ios) is built apart, into build-app, as a single-page
// app: it is opened at /account and renders every route in the browser.
const app = process.env.VITE_BASIS_APP === '1';

export default {
  ssr: false,
  buildDirectory: app ? 'build-app' : 'build',
  ...(app ? {} : { prerender: () => sitePaths() }),
} satisfies Config;
