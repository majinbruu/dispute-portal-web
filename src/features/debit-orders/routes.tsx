import type { RouteObject } from 'react-router';
import { DebitOrderDetailPage } from './DebitOrderDetailPage';
import { DebitOrderListPage } from './DebitOrderListPage';

export const debitOrderRoutes: RouteObject[] = [
  { path: 'debit-orders', element: <DebitOrderListPage /> },
  { path: 'debit-orders/:id', element: <DebitOrderDetailPage /> },
];
