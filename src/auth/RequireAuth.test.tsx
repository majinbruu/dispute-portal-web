import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthContextProps } from 'react-oidc-context';
import { RequireAuth } from './RequireAuth';

const authState = vi.hoisted((): { current: Partial<AuthContextProps> } => ({ current: {} }));

vi.mock('react-oidc-context', () => ({
  useAuth: () => authState.current,
  hasAuthParams: () => /[?&](code|error)=/.test(window.location.search),
}));

function setAuth(state: Partial<AuthContextProps>) {
  authState.current = {
    isAuthenticated: false,
    isLoading: false,
    signinRedirect: vi.fn().mockResolvedValue(undefined),
    ...state,
  };
  return authState.current;
}

function renderGate() {
  return render(
    <RequireAuth>
      <p>Protected content</p>
    </RequireAuth>,
  );
}

describe('RequireAuth', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('renders the app for a signed-in customer', () => {
    setAuth({ isAuthenticated: true });
    renderGate();

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('shows progress while the session is being established', () => {
    setAuth({ isLoading: true });
    renderGate();

    expect(screen.getByRole('status')).toHaveTextContent('Signing you in…');
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('shows the sign-in screen without redirecting automatically', () => {
    const auth = setAuth({});
    renderGate();

    expect(screen.getByRole('heading', { name: 'ACME Bank' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(auth.signinRedirect).not.toHaveBeenCalled();
  });

  it('starts the redirect from the button and remembers the current page', async () => {
    window.history.replaceState({}, '', '/disputes/42?from=inbox');
    const auth = setAuth({});
    renderGate();

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(auth.signinRedirect).toHaveBeenCalledWith({
      state: { returnTo: '/disputes/42?from=inbox' },
    });
  });

  it('disables the button while the redirect is starting', () => {
    setAuth({ activeNavigator: 'signinRedirect' });
    renderGate();

    expect(screen.getByRole('button', { name: 'Redirecting…' })).toBeDisabled();
  });

  it('reports a failed sign-in and strips the callback parameters from the URL', () => {
    window.history.replaceState({}, '', '/?code=abc&state=xyz');
    setAuth({
      error: Object.assign(new Error('No matching state found in storage'), {
        source: 'signinCallback' as const,
      }),
    });
    renderGate();

    expect(screen.getByRole('alert')).toHaveTextContent('We could not sign you in');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(window.location.search).toBe('');
  });
});
