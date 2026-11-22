import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, type RouteObject, RouterProvider } from 'react-router';
import { ApiProvider } from '../api/ApiProvider';
import { createApiClient } from '../api/client';
import { createFetchMock, type MockRoutes } from './apiMock';

interface RenderAppOptions {
  /** Routes to mount; usually a slice of the real route table. */
  routes: RouteObject[];
  /** Initial URL. */
  at: string;
  /** Fake API responses keyed by `"METHOD /path"`. */
  api?: MockRoutes;
}

/**
 * Renders routes with the real providers (TanStack Query, typed API client, router) but a fake
 * `fetch`, so tests exercise the same code paths as the browser up to the network boundary.
 */
export function renderApp({ routes, at, api = {} }: RenderAppOptions) {
  const fetchMock = createFetchMock(api);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const apiClient = createApiClient({
    baseUrl: 'http://api.test',
    getAccessToken: () => Promise.resolve('test-token'),
    fetch: fetchMock,
  });
  const router = createMemoryRouter(routes, { initialEntries: [at] });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={apiClient}>
        <RouterProvider router={router} />
      </ApiProvider>
    </QueryClientProvider>,
  );

  return { ...view, fetchMock, queryClient, router, user: userEvent.setup() };
}
