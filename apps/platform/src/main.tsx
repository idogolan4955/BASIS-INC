import '@basis/ui/fonts';
import './index.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { Shell } from './layout/Shell';
import { ModulePending } from './pages/ModulePending';
import { Companies } from './pages/parties/Companies';
import { CompanySheet } from './pages/parties/CompanySheet';
import { ProductSheet } from './pages/products/ProductSheet';
import { ProductsIndex } from './pages/products/ProductsIndex';
import { Shades } from './pages/products/Shades';
import { SkuLedger, SkuSheet } from './pages/products/Skus';
import { Loading, NoRole, SignIn } from './pages/access/SignIn';
import { Gateway } from './pages/gateway/Gateway';
import { SessionProvider, useSessionState } from './session';

function Root() {
  const state = useSessionState();
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'signed_out') return <SignIn />;
  if (state.status === 'no_role') return <NoRole email={state.email} signOut={state.signOut} />;
  return <Shell />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <Gateway /> },
      { path: 'products', element: <ProductsIndex /> },
      { path: 'products/skus', element: <SkuLedger /> },
      { path: 'products/skus/:code', element: <SkuSheet tab="overview" /> },
      { path: 'products/skus/:code/sourcing', element: <SkuSheet tab="sourcing" /> },
      { path: 'products/shades', element: <Shades /> },
      { path: 'products/:code', element: <ProductSheet tab="overview" /> },
      { path: 'products/:code/skus', element: <ProductSheet tab="skus" /> },
      { path: 'products/:code/shades', element: <ProductSheet tab="shades" /> },
      { path: 'suppliers', element: <Companies door="suppliers" /> },
      { path: 'suppliers/:id', element: <CompanySheet tab="overview" base="/suppliers" /> },
      { path: 'suppliers/:id/contacts', element: <CompanySheet tab="contacts" base="/suppliers" /> },
      { path: 'suppliers/:id/places', element: <CompanySheet tab="places" base="/suppliers" /> },
      { path: 'customers', element: <Companies door="customers" /> },
      { path: 'customers/:id', element: <CompanySheet tab="overview" base="/customers" /> },
      { path: 'customers/:id/contacts', element: <CompanySheet tab="contacts" base="/customers" /> },
      { path: 'customers/:id/places', element: <CompanySheet tab="places" base="/customers" /> },
      { path: ':module/*', element: <ModulePending /> },
    ],
  },
]);

const queryClient = new QueryClient();
const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
