const OIDC_RESPONSE_PARAMS = [
  'code',
  'state',
  'session_state',
  'iss',
  'error',
  'error_description',
];

/**
 * Returns a safe in-app path to go back to after sign-in. Anything that is not a plain
 * same-origin path (absolute URLs, protocol-relative URLs, backslash tricks) becomes `/`.
 */
export function sanitizeReturnTo(value: unknown): string {
  if (typeof value !== 'string') return '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value;
}

/** The current location without any OpenID Connect response parameters. */
export function currentReturnTo(location: Pick<Location, 'pathname' | 'search'>): string {
  const params = new URLSearchParams(location.search);
  for (const name of OIDC_RESPONSE_PARAMS) params.delete(name);
  const search = params.toString();
  return sanitizeReturnTo(`${location.pathname}${search ? `?${search}` : ''}`);
}

/** Reads the path stored in the OIDC `state` when the sign-in redirect started. */
export function returnToFromState(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'returnTo' in state) {
    return sanitizeReturnTo(state.returnTo);
  }
  return '/';
}
