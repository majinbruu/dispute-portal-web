import type { RouteObject } from 'react-router';
import { DisputeFormPage } from './DisputeFormPage';

export const disputeRoutes: RouteObject[] = [
  { path: 'debit-orders/:id/dispute', element: <DisputeFormPage /> },
];
