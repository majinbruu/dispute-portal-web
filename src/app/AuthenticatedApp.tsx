import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { ApiProvider } from '../api/ApiProvider';
import { createApiClient } from '../api/client';
import { createQueryClient } from '../api/queryClient';
import { endLocalSession, getAccessToken } from '../auth/userManager';
import { getAppConfig } from '../lib/config';
import { createAppRouter } from './router';

/**
 * Everything that exists only for a signed-in customer: the API client, the server-state cache
 * and the router. Mounting it after sign-in means the cache can never outlive a session.
 */
export function AuthenticatedApp() {
  const [queryClient] = useState(createQueryClient);
  const [apiClient] = useState(() =>
    createApiClient({
      baseUrl: getAppConfig().apiBaseUrl,
      getAccessToken,
      // The API no longer accepts the token: drop the session so the sign-in screen is shown.
      onUnauthorized: () => void endLocalSession(),
    }),
  );
  const [router] = useState(createAppRouter);

  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={apiClient}>
        <RouterProvider router={router} />
      </ApiProvider>
    </QueryClientProvider>
  );
}
