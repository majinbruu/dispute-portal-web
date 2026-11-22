import type { User } from 'oidc-client-ts';
import type { ReactNode } from 'react';
import { AuthProvider as OidcAuthProvider } from 'react-oidc-context';
import { returnToFromState } from './returnTo';
import { getUserManager } from './userManager';

/**
 * Runs once the authorization code has been exchanged. Replaces the callback URL (which carries
 * `code` and `state`) with the page the user was on before signing in, so the parameters never
 * stay in the address bar or the history.
 */
function handleSigninCallback(user: User | undefined): void {
  window.history.replaceState({}, document.title, returnToFromState(user?.state));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <OidcAuthProvider userManager={getUserManager()} onSigninCallback={handleSigninCallback}>
      {children}
    </OidcAuthProvider>
  );
}
