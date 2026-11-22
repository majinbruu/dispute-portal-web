import type { RouteObject } from 'react-router';
import { MandateDetailPage } from './MandateDetailPage';
import { MandateListPage } from './MandateListPage';
import { MandatesHomePage } from './MandatesHomePage';
import { MANDATE_TYPE_VIEWS } from './presentation';

export const mandateRoutes: RouteObject[] = [
  { path: 'mandates', element: <MandatesHomePage /> },
  // Static segments outrank `:id`, so these two never collide with a mandate ID.
  {
    path: `mandates/${MANDATE_TYPE_VIEWS.DebiCheck.slug}`,
    element: <MandateListPage type="DebiCheck" />,
  },
  {
    path: `mandates/${MANDATE_TYPE_VIEWS.Registered.slug}`,
    element: <MandateListPage type="Registered" />,
  },
  { path: 'mandates/:id', element: <MandateDetailPage /> },
];
