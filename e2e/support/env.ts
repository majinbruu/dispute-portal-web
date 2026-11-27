/**
 * Where the journeys run and who they sign in as. This is the only place the environment is
 * read. The defaults are the demo stack's own values: the users of the demo Keycloak realm in
 * the API repository, which exist only on a local stack.
 */

export interface PortalUser {
  username: string;
  password: string;
}

export const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export const customer: PortalUser = {
  username: process.env.E2E_CUSTOMER_USERNAME ?? 'thandi',
  password: process.env.E2E_CUSTOMER_PASSWORD ?? 'AcmeDemo!2026',
};

export const agent: PortalUser = {
  username: process.env.E2E_AGENT_USERNAME ?? 'zanele',
  password: process.env.E2E_AGENT_PASSWORD ?? 'AcmeDemo!2026',
};
