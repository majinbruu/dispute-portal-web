/** The two kinds of user the portal has screens for. */
export type PortalRole = 'agent' | 'customer';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The payload of a JWT is its middle part: base64url-encoded UTF-8 JSON. */
function decodePayload(token: string): unknown {
  const payload = token.split('.')[1] ?? '';
  const bytes = Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), (char) =>
    char.charCodeAt(0),
  );
  return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * Reads the `roles` claim from the access token. The identity provider puts the roles in the
 * access token only, so they are not in the ID token profile.
 *
 * The token is not verified here and does not need to be: the roles only decide which screens
 * to show. The API verifies the token and enforces access on every request.
 */
export function rolesFromAccessToken(token: string | undefined): string[] {
  if (!token) return [];
  try {
    const claims = decodePayload(token);
    const roles = isRecord(claims) ? claims.roles : undefined;
    return Array.isArray(roles)
      ? roles.filter((role): role is string => typeof role === 'string')
      : [];
  } catch {
    // Not a JWT we can read: treat the user as having no role rather than failing the app.
    return [];
  }
}

/**
 * Which side of the portal a user works in. The API keeps the two apart (an agent is refused on
 * customer endpoints and the other way round), so a user is treated as one or the other; the
 * agent role wins for an account that somehow has both.
 */
export function portalRole(roles: readonly string[]): PortalRole | undefined {
  if (roles.includes('agent')) return 'agent';
  if (roles.includes('customer')) return 'customer';
  return undefined;
}
