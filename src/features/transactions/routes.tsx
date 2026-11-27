import type { RouteObject } from 'react-router';
import { TransactionDetailPage } from './TransactionDetailPage';
import { TransactionListPage } from './TransactionListPage';

export const transactionRoutes: RouteObject[] = [
  { path: 'transactions', element: <TransactionListPage /> },
  { path: 'transactions/:id', element: <TransactionDetailPage /> },
];
