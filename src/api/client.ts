import createClient, { type Client } from 'openapi-fetch';
import { ApiError, networkProblem, parseProblem } from '../lib/problem';
import type { paths } from './schema';

export type ApiClient = Client<paths>;

export interface ApiClientOptions {
  /** Origin of the API; empty means the same origin as the app. */
  baseUrl: string;
  /** Supplies the bearer token for each request. */
  getAccessToken: () => Promise<string | undefined>;
  /** Called when the API rejects the token, so the app can ask the user to sign in again. */
  onUnauthorized?: () => void;
  /** Test seam; defaults to the global fetch. */
  fetch?: typeof globalThis.fetch;
}

/** Creates the typed client for the Dispute Portal API (types generated from its OpenAPI). */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const client = createClient<paths>({
    baseUrl: options.baseUrl || window.location.origin,
    headers: { Accept: 'application/json, application/problem+json' },
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });

  client.use({
    async onRequest({ request }) {
      const token = await options.getAccessToken();
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }
      return request;
    },
    onResponse({ response }) {
      if (response.status === 401) {
        options.onUnauthorized?.();
      }
      return undefined;
    },
  });

  return client;
}

interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/**
 * Awaits an openapi-fetch call and returns its data, or throws an {@link ApiError} carrying the
 * problem document. Failures to reach the server become a `network_error` problem.
 */
export async function unwrap<T>(call: Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await call;
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError(networkProblem(), { cause });
  }
  if (!result.response.ok || result.data === undefined) {
    throw new ApiError(parseProblem(result.error, result.response.status));
  }
  return result.data;
}
