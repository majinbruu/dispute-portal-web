import { User } from 'oidc-client-ts';

interface OidcUserOptions {
  /** The `state` passed to `signinRedirect`, round-tripped by the identity provider. */
  state?: unknown;
  /** Seconds until the access token expires; negative for an expired token. */
  expiresIn?: number;
}

/** A signed-in user as oidc-client-ts builds it after a successful code exchange. */
export function oidcUser({ state, expiresIn = 300 }: OidcUserOptions = {}): User {
  const now = Math.floor(Date.now() / 1000);
  return new User({
    access_token: 'access-token',
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
