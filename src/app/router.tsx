import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import type { PortalRole } from '../auth/roles';
import { agentRoutes } from '../features/agent/routes';
import { disputeRoutes } from '../features/disputes/routes';
import { inboxRoutes } from '../features/inbox/routes';
import { mandateRoutes } from '../features/mandates/routes';
import { transactionRoutes } from '../features/transactions/routes';
import { AppLayout } from './AppLayout';
import { type HomeLink, NotFoundPage } from './NotFoundPage';
import { RouteError } from './RouteError';

const CUSTOMER_HOME: HomeLink = { to: '/transactions', label: 'Go to my transactions' };
const AGENT_HOME: HomeLink = { to: '/agent', label: 'Go to the dispute queue' };

const CUSTOMER_NAV = [
  { to: '/transactions', label: 'Transactions' },
  { to: '/disputes', label: 'Disputes' },
  { to: '/mandates', label: 'Mandates' },
];
const AGENT_NAV = [{ to: '/agent', label: 'Dispute queue' }];

/** One side of the portal: its layout, its pages, and its home for `/` and for dead ends. */
function portalRoutes(layout: ReactNode, home: HomeLink, pages: RouteObject[]): RouteObject[] {
  return [
    {
      path: '/',
      element: layout,
      children: [
        {
          // Pathless route so a screen that throws is replaced inside the layout, not instead of it.
          errorElement: <RouteError home={home} />,
          children: [
            { index: true, element: <Navigate to={home.to} replace /> },
            ...pages,
            { path: '*', element: <NotFoundPage home={home} /> },
          ],
        },
      ],
    },
  ];
}

export const customerRoutes = portalRoutes(
  <AppLayout navItems={CUSTOMER_NAV} inbox />,
  CUSTOMER_HOME,
  [...transactionRoutes, ...disputeRoutes, ...mandateRoutes, ...inboxRoutes],
);

/** Agents have no inbox: notifications are a customer feature and the API refuses them. */
export const agentPortalRoutes = portalRoutes(
  <AppLayout navItems={AGENT_NAV} />,
  AGENT_HOME,
  agentRoutes,
);

/**
 * The router for one role. Each role gets only its own route table, so the other role's pages
 * and navigation are not merely hidden: they do not exist for this user. The API enforces the
 * same split on every request.
 *
 * Created after sign-in rather than at module load, so the router first reads the location
 * once the OIDC callback has replaced the URL with the page the user asked for.
 */
export function createAppRouter(role: PortalRole) {
  return createBrowserRouter(role === 'agent' ? agentPortalRoutes : customerRoutes);
}
