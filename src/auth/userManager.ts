import {
  InMemoryWebStorage,
  UserManager,
  type UserManagerSettings,
  WebStorageStateStore,
} from 'oidc-client-ts';
import { type AppConfig, getAppConfig } from '../lib/config';

/**
 * OpenID Connect settings: Authorization Code flow with PKCE for a public client (no secret).
 *
 * Tokens live in memory only, so nothing an XSS payload or another tab could read is persisted.
 * The cost is that a full page reload needs a new sign-in round trip, which the identity
 * provider answers from its own session cookie without asking for credentials again.
 */
export function buildOidcSettings(
  config: AppConfig,
  origin: string = window.location.origin,
): UserManagerSettings {
  const appUrl = `${origin}/`;
  return {
    authority: config.oidcAuthority,
    client_id: config.oidcClientId,
    redirect_uri: appUrl,
    post_logout_redirect_uri: appUrl,
    response_type: 'code',
    scope: 'openid profile',
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    // The PKCE verifier and state must survive the redirect to the identity provider and back,
    // so they are kept in this tab's session storage. They are single use and hold no tokens.
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
    automaticSilentRenew: true,
    monitorSession: false,
    loadUserInfo: false,
  };
}

let userManager: UserManager | undefined;

/** The single UserManager for the app, shared by the React provider and the API client. */
export function getUserManager(): UserManager {
  userManager ??= new UserManager(buildOidcSettings(getAppConfig()));
  return userManager;
}

/** Current access token, or undefined when signed out or expired. */
export async function getAccessToken(): Promise<string | undefined> {
  const user = await getUserManager().getUser();
  return user && !user.expired ? user.access_token : undefined;
}

/** Forgets the local session, which sends the user back to the sign-in screen. */
export async function endLocalSession(): Promise<void> {
  await getUserManager().removeUser();
}
