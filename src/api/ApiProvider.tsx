import type { ReactNode } from 'react';
import { ApiClientContext } from './apiContext';
import type { ApiClient } from './client';

interface ApiProviderProps {
  client: ApiClient;
  children: ReactNode;
}

export function ApiProvider({ client, children }: ApiProviderProps) {
  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>;
}
