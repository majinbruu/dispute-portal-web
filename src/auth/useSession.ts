import { useCallback } from 'react';
import { useAuth } from 'react-oidc-context';

export interface Session {
  /** Name to greet the signed-in customer with. */
  displayName: string;
  signOut: () => void;
}

/** The signed-in customer's session. Only use inside `RequireAuth`. */
export function useSession(): Session {
  const auth = useAuth();
  const profile = auth.user?.profile;
  const displayName = profile?.name ?? profile?.preferred_username ?? 'Customer';

  const signOut = useCallback(() => {
    // Ends the session at the identity provider too; it redirects back to the sign-in screen.
    void auth.signoutRedirect();
  }, [auth]);

  return { displayName, signOut };
}
