import '@basis/ui/fonts';
import './index.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { Shell } from './layout/Shell';
import { ModulePending } from './pages/ModulePending';
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
