import { vi } from 'vitest';

type Handler = (request: Request) => Response | Promise<Response>;

/** Either a JSON body to return with 200, or a function building the response. */
export type MockRoutes = Record<string, Handler | Record<string, unknown> | unknown[]>;

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function problemResponse(
  status: number,
  code: string,
  detail: string,
  extra: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({ title: code, status, detail, code, traceId: `trace-${code}`, ...extra }),
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

/**
 * A fake `fetch` keyed by `"METHOD /path"` (query string ignored). Unknown routes answer 404 so
 * a test that forgets a route fails loudly through the UI's error state.
 */
export function createFetchMock(routes: MockRoutes) {
  return vi.fn<typeof fetch>((input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const key = `${request.method} ${new URL(request.url).pathname}`;
    const handler = routes[key];
    if (handler === undefined) {
      return Promise.resolve(problemResponse(404, 'not_found', `No mock for ${key}`));
    }
    return Promise.resolve(
      typeof handler === 'function' ? handler(request) : jsonResponse(handler),
    );
  });
}

/** Requests the fake fetch received for a route, e.g. `requestsTo(fetchMock, 'POST', '/x')`. */
export function requestsTo(
  fetchMock: ReturnType<typeof createFetchMock>,
  method: string,
  pathname: string,
): Request[] {
  return fetchMock.mock.calls
    .map(([input]) => input)
    .filter((input): input is Request => input instanceof Request)
    .filter((request) => request.method === method && new URL(request.url).pathname === pathname);
}

export function paged<T>(items: T[], overrides: Partial<Record<string, number>> = {}) {
  return {
    items,
    page: 1,
    pageSize: 10,
    totalItems: items.length,
    totalPages: items.length === 0 ? 0 : 1,
    ...overrides,
  };
}
