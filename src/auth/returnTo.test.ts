import { currentReturnTo, returnToFromState, sanitizeReturnTo } from './returnTo';

describe('sanitizeReturnTo', () => {
  it('keeps in-app paths', () => {
    expect(sanitizeReturnTo('/disputes/123?tab=1')).toBe('/disputes/123?tab=1');
  });

  it.each([
    'https://evil.example/',
    '//evil.example/',
    '/\\evil.example',
    'debit-orders',
    '',
    undefined,
    null,
    42,
  ])('falls back to the home page for %s', (value) => {
    expect(sanitizeReturnTo(value)).toBe('/');
  });
});

describe('currentReturnTo', () => {
  it('keeps the path and unrelated query parameters', () => {
    expect(currentReturnTo({ pathname: '/debit-orders', search: '?status=Failed&page=2' })).toBe(
      '/debit-orders?status=Failed&page=2',
    );
  });

  it('drops OpenID Connect response parameters', () => {
    expect(
      currentReturnTo({ pathname: '/', search: '?code=abc&state=xyz&session_state=s&iss=i' }),
    ).toBe('/');
    expect(currentReturnTo({ pathname: '/inbox', search: '?error=access_denied&page=3' })).toBe(
      '/inbox?page=3',
    );
  });
});

describe('returnToFromState', () => {
  it('reads the stored path', () => {
    expect(returnToFromState({ returnTo: '/mandates/debicheck' })).toBe('/mandates/debicheck');
  });

  it('ignores missing or unsafe state', () => {
    expect(returnToFromState(undefined)).toBe('/');
    expect(returnToFromState('x')).toBe('/');
    expect(returnToFromState({ returnTo: 'https://evil.example' })).toBe('/');
  });
});
