import type { RouteObject } from 'react-router';
import { DisputeDetailPage } from './DisputeDetailPage';
import { DisputeFormPage } from './DisputeFormPage';
import { DisputeListPage } from './DisputeListPage';

export const disputeRoutes: RouteObject[] = [
  { path: 'debit-orders/:id/dispute', element: <DisputeFormPage /> },
  { path: 'disputes', element: <DisputeListPage /> },
  { path: 'disputes/:id', element: <DisputeDetailPage /> },
];
