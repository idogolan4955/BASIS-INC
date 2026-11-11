import '@basis/ui/fonts';
import '@fontsource/permanent-marker/latin-400.css';
import './app.css';

import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import { SiteShell } from './site/shell';
import { IN_APP } from './native/platform';

// The document shell of the public site: editorial register.

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={IN_APP ? 'app' : undefined}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#f3eee6" />
        <Meta />
        <Links />
      </head>
      <body className={IN_APP ? 'bg-bone text-ink' : 'bg-surface text-ink'}>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return (
    <SiteShell>
      <Outlet />
    </SiteShell>
  );
}
