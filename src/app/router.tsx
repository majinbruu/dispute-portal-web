import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { disputeRoutes } from '../features/disputes/routes';
import { inboxRoutes } from '../features/inbox/routes';
import { mandateRoutes } from '../features/mandates/routes';
import { transactionRoutes } from '../features/transactions/routes';
import { AppLayout } from './AppLayout';
import { NotFoundPage } from './NotFoundPage';
import { RouteError } from './RouteError';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        // Pathless route so a screen that throws is replaced inside the layout, not instead of it.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Navigate to="/transactions" replace /> },
          ...transactionRoutes,
          ...disputeRoutes,
          ...mandateRoutes,
          ...inboxRoutes,
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

/**
 * Created after sign-in rather than at module load, so the router first reads the location
 * once the OIDC callback has replaced the URL with the page the user asked for.
 */
export function createAppRouter() {
  return createBrowserRouter(routes);
}
