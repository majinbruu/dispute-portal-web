import { User } from 'oidc-client-ts';

interface OidcUserOptions {
  /** The `state` passed to `signinRedirect`, round-tripped by the identity provider. */
  state?: unknown;
  /** Seconds until the access token expires; negative for an expired token. */
  expiresIn?: number;
  /** The `roles` claim of the access token. */
  roles?: string[];
}

function base64Url(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** An access token shaped like the identity provider's: a JWT whose payload has these claims. */
export function accessToken(claims: Record<string, unknown>): string {
  return `${base64Url({ alg: 'RS256', typ: 'JWT' })}.${base64Url(claims)}.signature`;
}

/** A signed-in user as oidc-client-ts builds it after a successful code exchange. */
export function oidcUser({
  state,
  expiresIn = 300,
  roles = ['customer'],
}: OidcUserOptions = {}): User {
  const now = Math.floor(Date.now() / 1000);
  return new User({
    access_token: accessToken({ sub: 'customer-1', roles }),
    token_type: 'Bearer',
    profile: {
      sub: 'customer-1',
      name: 'Thandi Mokoena',
      iss: 'http://localhost:8080/realms/acme-bank',
      aud: 'dispute-portal-web',
      iat: now,
      exp: now + expiresIn,
    },
    expires_at: now + expiresIn,
    userState: state,
  });
}
