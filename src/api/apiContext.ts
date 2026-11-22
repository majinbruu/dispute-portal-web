import { createContext, useContext } from 'react';
import type { ApiClient } from './client';

export const ApiClientContext = createContext<ApiClient | null>(null);

/** The typed API client. Provided once near the root; tests supply a client with a fake fetch. */
export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error('useApiClient must be used inside <ApiProvider>');
  }
  return client;
}
