import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/problem';

const MAX_RETRIES = 2;

/** Retry only what may succeed next time: network failures and server errors, never 4xx. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (!(error instanceof ApiError)) return false;
  return error.status === 0 || error.status >= 500;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        // Balances and dispute states change behind the user's back, so re-read on focus.
        refetchOnWindowFocus: true,
      },
      mutations: {
        // Submissions are retried by the user, with the same idempotency key, never silently.
        retry: false,
      },
    },
  });
}
