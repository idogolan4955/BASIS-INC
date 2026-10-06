import '@basis/ui/fonts';
import './index.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { Shell } from './layout/Shell';
import { ModulePending } from './pages/ModulePending';
import { ProcessTemplates, ProductionRuns, PurchaseOrders } from './pages/manufacturing/Manufacturing';
import { PurchaseOrderSheet } from './pages/manufacturing/PurchaseOrderSheet';
import { RunSheet } from './pages/manufacturing/RunSheet';
import { LotSheet } from './pages/inventory/LotSheet';
import { Documents } from './pages/documents/Documents';
import { Settings } from './pages/settings/Settings';
import { Tasks } from './pages/operations/Tasks';
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
      { path: 'operations/tasks', element: <Tasks /> },
      { path: 'manufacturing', element: <PurchaseOrders /> },
      { path: 'manufacturing/purchase-orders', element: <PurchaseOrders /> },
      { path: 'manufacturing/purchase-orders/:number', element: <PurchaseOrderSheet tab="overview" /> },
      { path: 'manufacturing/purchase-orders/:number/production', element: <PurchaseOrderSheet tab="production" /> },
      { path: 'manufacturing/purchase-orders/:number/payments', element: <PurchaseOrderSheet tab="payments" /> },
      { path: 'manufacturing/purchase-orders/:number/documents', element: <PurchaseOrderSheet tab="documents" /> },
      { path: 'manufacturing/purchase-orders/:number/timeline', element: <PurchaseOrderSheet tab="timeline" /> },
      { path: 'manufacturing/runs', element: <ProductionRuns /> },
      { path: 'manufacturing/runs/:number', element: <RunSheet tab="milestones" /> },
      { path: 'manufacturing/runs/:number/lots', element: <RunSheet tab="lots" /> },
      { path: 'manufacturing/runs/:number/packing', element: <RunSheet tab="packing" /> },
      { path: 'manufacturing/runs/:number/documents', element: <RunSheet tab="documents" /> },
      { path: 'manufacturing/runs/:number/timeline', element: <RunSheet tab="timeline" /> },
      { path: 'manufacturing/templates', element: <ProcessTemplates /> },
      { path: 'inventory/lots/:number', element: <LotSheet tab="rolls" /> },
      { path: 'inventory/lots/:number/documents', element: <LotSheet tab="documents" /> },
      { path: 'inventory/lots/:number/timeline', element: <LotSheet tab="timeline" /> },
      { path: 'documents', element: <Documents /> },
      { path: 'settings', element: <Settings /> },
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
