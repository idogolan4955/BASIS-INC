import '@basis/ui/fonts';
import '@fontsource/permanent-marker/latin-400.css';
import './app.css';

import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import { SiteShell } from './site/shell';

// The document shell of the public site: editorial register.

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f3eee6" />
        <Meta />
        <Links />
      </head>
      <body className="bg-surface text-ink">
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
