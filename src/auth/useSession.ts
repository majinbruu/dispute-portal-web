import { useCallback } from 'react';
import { useAuth } from 'react-oidc-context';
import { type PortalRole, portalRole, rolesFromAccessToken } from './roles';

export interface Session {
  /** Name to greet the signed-in user with. */
  displayName: string;
  /** Which side of the portal the user works in; undefined when their account has neither role. */
  role: PortalRole | undefined;
  signOut: () => void;
}

/** The signed-in user's session. Only use inside `RequireAuth`. */
export function useSession(): Session {
  const auth = useAuth();
  const profile = auth.user?.profile;
  const role = portalRole(rolesFromAccessToken(auth.user?.access_token));
  const displayName =
    profile?.name ?? profile?.preferred_username ?? (role === 'agent' ? 'Agent' : 'Customer');

  const signOut = useCallback(() => {
    // Ends the session at the identity provider too; it redirects back to the sign-in screen.
    void auth.signoutRedirect();
  }, [auth]);

  return { displayName, role, signOut };
}
