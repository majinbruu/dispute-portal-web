import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { ApiProvider } from '../api/ApiProvider';
import { createApiClient } from '../api/client';
import { createQueryClient } from '../api/queryClient';
import { NoAccessScreen } from '../auth/NoAccessScreen';
import type { PortalRole } from '../auth/roles';
import { endLocalSession, getAccessToken } from '../auth/userManager';
import { useSession } from '../auth/useSession';
import { getAppConfig } from '../lib/config';
import { createAppRouter } from './router';

/**
 * Everything that exists only for a signed-in user of one role: the API client, the server-state
 * cache and that role's router. Mounting it after sign-in means the cache can never outlive a
 * session.
 */
function Portal({ role }: { role: PortalRole }) {
  const [queryClient] = useState(createQueryClient);
  const [apiClient] = useState(() =>
    createApiClient({
      baseUrl: getAppConfig().apiBaseUrl,
      getAccessToken,
      // The API no longer accepts the token: drop the session so the sign-in screen is shown.
      onUnauthorized: () => void endLocalSession(),
    }),
  );
  const [router] = useState(() => createAppRouter(role));

  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={apiClient}>
        <RouterProvider router={router} />
      </ApiProvider>
    </QueryClientProvider>
  );
}

/**
 * Sends a signed-in user to their side of the portal: the customer's pages or the agent's. An
 * account with neither role gets no pages and no API calls, only an explanation.
 */
export function AuthenticatedApp() {
  const { role } = useSession();
  if (!role) {
    return <NoAccessScreen />;
  }
  // Keyed by role, so if a renewed token ever carried a different role the portal would start
  // again with that role's router and an empty cache.
  return <Portal key={role} role={role} />;
}
