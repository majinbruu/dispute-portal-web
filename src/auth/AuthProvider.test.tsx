import { render, screen } from '@testing-library/react';
import type { User } from 'oidc-client-ts';
import { useAuth } from 'react-oidc-context';
import { oidcUser } from '../test/oidcUser';
import { AuthProvider } from './AuthProvider';
import { getUserManager } from './userManager';

function SessionProbe() {
  const auth = useAuth();
  if (auth.isLoading) return <p>Loading</p>;
  return <p>{auth.isAuthenticated ? `Signed in as ${auth.user?.profile.name}` : 'Signed out'}</p>;
}

function renderProvider() {
  return render(
    <AuthProvider>
      <SessionProbe />
    </AuthProvider>,
  );
}

/** Stands in for the code exchange with the identity provider, the only network step. */
function stubCodeExchange(user: User | undefined) {
  return vi.spyOn(getUserManager(), 'signinCallback').mockResolvedValue(user);
}

function currentUrl() {
  return `${window.location.pathname}${window.location.search}`;
}

describe('AuthProvider', () => {
  beforeAll(() => {
    window.__APP_CONFIG__ = {
      oidcAuthority: 'http://localhost:8080/realms/acme-bank',
      oidcClientId: 'dispute-portal-web',
      apiBaseUrl: '',
    };
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  afterAll(() => {
    delete window.__APP_CONFIG__;
  });

  it('signs the customer in from the callback and returns to the page they came from', async () => {
    window.history.replaceState({}, '', '/?code=abc&state=xyz');
    stubCodeExchange(oidcUser({ state: { returnTo: '/disputes/42?from=inbox' } }));
    renderProvider();

    expect(await screen.findByText('Signed in as Thandi Mokoena')).toBeInTheDocument();
    expect(currentUrl()).toBe('/disputes/42?from=inbox');
  });

  it('goes to the home page when the stored return path is not an in-app path', async () => {
    window.history.replaceState({}, '', '/?code=abc&state=xyz');
    stubCodeExchange(oidcUser({ state: { returnTo: 'https://evil.example/' } }));
    renderProvider();

    expect(await screen.findByText('Signed in as Thandi Mokoena')).toBeInTheDocument();
    expect(currentUrl()).toBe('/');
  });

  it('removes the callback parameters even when the callback yields no user', async () => {
    window.history.replaceState({}, '', '/inbox?code=abc&state=xyz');
    stubCodeExchange(undefined);
    renderProvider();

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(currentUrl()).toBe('/');
  });

  it('leaves the address alone when the page is not a sign-in callback', async () => {
    window.history.replaceState({}, '', '/debit-orders?status=Rejected');
    const codeExchange = stubCodeExchange(oidcUser());
    renderProvider();

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(codeExchange).not.toHaveBeenCalled();
    expect(currentUrl()).toBe('/debit-orders?status=Rejected');
  });
});
