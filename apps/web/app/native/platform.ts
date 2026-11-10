// The BASIS iPhone app (apps/ios, docs/APP_STORE.md) carries this site's
// portal, built apart with VITE_BASIS_APP=1. The flag is fixed at build time,
// so nothing of the app runs on the site that Hosting serves (its plugins sit
// in a chunk the site never loads), and the page the app opens renders the
// same on its first paint as afterwards.

export const IN_APP = import.meta.env.VITE_BASIS_APP === '1';

/** Where the site lives: the app's bundle calls its functions there. */
export const SITE_ORIGIN = 'https://basis-inc.web.app';

/** Development, and an app bundle made with --local, talk to the emulators, never to production data. */
export const LOCAL = import.meta.env.DEV || import.meta.env.VITE_BASIS_LOCAL === '1';

/** The api function: same origin on the site, the site's address from the app, the emulator locally. */
export const API_BASE = LOCAL ? 'http://127.0.0.1:5001/basis-inc/europe-west1/api' : IN_APP ? `${SITE_ORIGIN}/api` : '/api';

/**
 * The page of the portal a link opened in the app should show: an invitation
 * or a record on the site's own address, or the app's own scheme. Anything
 * else opens the account.
 */
export function appPath(link: string): string {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return '/account';
  }
  // basisinc://account/quotes/QUO-26-0012 — the host is the first segment.
  const path = url.protocol === 'basisinc:' ? `/${url.host}${url.pathname}` : url.pathname;
  const clean = path.replace(/\/+$/, '') || '/';
  return clean === '/account' || clean.startsWith('/account/') ? `${clean}${url.search}` : '/account';
}
