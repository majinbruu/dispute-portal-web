import { ApiError } from '../lib/problem';
import { createApiClient, unwrap } from './client';

function jsonResponse(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': contentType } });
}

function setup(
  response: () => Response | Promise<Response>,
  getAccessToken: () => Promise<string | undefined> = () => Promise.resolve('tok'),
) {
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(response()));
  const onUnauthorized = vi.fn();
  const client = createApiClient({
    baseUrl: 'http://api.test',
    getAccessToken,
    onUnauthorized,
    fetch: fetchMock,
  });
  const sentRequest = () => fetchMock.mock.calls[0]![0] as Request;
  return { client, fetchMock, onUnauthorized, sentRequest };
}

describe('createApiClient', () => {
  it('sends the bearer token and typed query parameters', async () => {
    const { client, sentRequest } = setup(() => jsonResponse({ unread: 3 }));

    await client.GET('/api/v1/debit-orders', {
      params: { query: { Status: 'Failed', Page: 2, PageSize: 10 } },
    });

    const request = sentRequest();
    expect(request.url).toBe(
      'http://api.test/api/v1/debit-orders?Status=Failed&Page=2&PageSize=10',
    );
    expect(request.headers.get('Authorization')).toBe('Bearer tok');
    expect(request.headers.get('Accept')).toContain('application/problem+json');
  });

  it('omits the Authorization header when there is no token', async () => {
    const { client, sentRequest } = setup(
      () => jsonResponse({ unread: 0 }),
      () => Promise.resolve(undefined),
    );

    await client.GET('/api/v1/notifications/unread-count');

    expect(sentRequest().headers.has('Authorization')).toBe(false);
  });

  it('defaults to the app origin when no base URL is configured', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse({ unread: 0 })));
    const client = createApiClient({
      baseUrl: '',
      getAccessToken: () => Promise.resolve('tok'),
      fetch: fetchMock,
    });

    await client.GET('/api/v1/notifications/unread-count');

    expect((fetchMock.mock.calls[0]![0] as Request).url).toBe(
      `${window.location.origin}/api/v1/notifications/unread-count`,
    );
  });

  it('reports a rejected token', async () => {
    const { client, onUnauthorized } = setup(() => new Response(null, { status: 401 }));

    await client.GET('/api/v1/notifications/unread-count');

    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});

describe('unwrap', () => {
  it('returns the response data', async () => {
    const { client } = setup(() => jsonResponse({ unread: 3 }));

    await expect(unwrap(client.GET('/api/v1/notifications/unread-count'))).resolves.toEqual({
      unread: 3,
    });
  });

  it('throws an ApiError built from the problem document', async () => {
    const { client } = setup(() =>
      jsonResponse(
        {
          title: 'Already disputed',
          status: 409,
          detail: 'This debit order has already been disputed.',
          code: 'already_disputed',
          traceId: 'trace-123',
        },
        409,
        'application/problem+json',
      ),
    );

    const error = await unwrap(
      client.POST('/api/v1/disputes', {
        body: { debitOrderId: 'd1', reasonCode: 'R1', comment: null },
        params: { header: { 'Idempotency-Key': 'key-1' } },
      }),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).problem).toEqual({
      status: 409,
      code: 'already_disputed',
      title: 'Already disputed',
      detail: 'This debit order has already been disputed.',
      traceId: 'trace-123',
    });
  });

  it('copes with error bodies that are not JSON', async () => {
    const { client } = setup(
      () => new Response('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway' }),
    );

    const error = await unwrap(client.GET('/api/v1/notifications/unread-count')).catch(
      (caught: unknown) => caught,
    );

    expect((error as ApiError).status).toBe(502);
    expect((error as ApiError).code).toBe('unknown_error');
  });

  it('turns a failure to reach the server into a network problem', async () => {
    const { client } = setup(() => Promise.reject(new TypeError('Failed to fetch')));

    const error = await unwrap(client.GET('/api/v1/notifications/unread-count')).catch(
      (caught: unknown) => caught,
    );

    expect((error as ApiError).code).toBe('network_error');
    expect((error as ApiError).status).toBe(0);
  });

  it('lets an aborted request propagate so cancelled queries stay silent', async () => {
    const abort = new DOMException('Aborted', 'AbortError');
    const { client } = setup(() => Promise.reject(abort));

    await expect(unwrap(client.GET('/api/v1/notifications/unread-count'))).rejects.toBe(abort);
  });
});
