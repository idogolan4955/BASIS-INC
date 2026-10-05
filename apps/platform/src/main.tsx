import '@basis/ui/fonts';
import './index.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { Shell } from './layout/Shell';
import { ModulePending } from './pages/ModulePending';
import { NotConnected } from './pages/NotConnected';
import { Gateway } from './pages/gateway/Gateway';
import { SessionProvider, useSession } from './session';

function Root() {
  return useSession() ? <Shell /> : <NotConnected />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <Gateway /> },
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
