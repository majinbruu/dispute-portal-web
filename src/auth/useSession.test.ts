import { renderHook } from '@testing-library/react';
import type { AuthContextProps } from 'react-oidc-context';
import { oidcUser } from '../test/oidcUser';
import { useSession } from './useSession';

const authState = vi.hoisted((): { current: Partial<AuthContextProps> } => ({ current: {} }));

vi.mock('react-oidc-context', () => ({
  useAuth: () => authState.current,
}));

function setAuth(state: Partial<AuthContextProps>) {
  authState.current = {
    signoutRedirect: vi.fn().mockResolvedValue(undefined),
    ...state,
  };
  return authState.current;
}

function userWithProfile(claims: { name?: string; preferred_username?: string }) {
  const user = oidcUser();
  user.profile = { ...user.profile, name: undefined, ...claims };
  return user;
}

describe('useSession', () => {
  it('greets the customer by their full name', () => {
    setAuth({ user: userWithProfile({ name: 'Thandi Mokoena', preferred_username: 'thandi' }) });

    const { result } = renderHook(() => useSession());

    expect(result.current.displayName).toBe('Thandi Mokoena');
  });

  it('falls back to the username when the profile has no name', () => {
    setAuth({ user: userWithProfile({ preferred_username: 'thandi' }) });

    const { result } = renderHook(() => useSession());

    expect(result.current.displayName).toBe('thandi');
  });

  it('uses a generic greeting when the profile names nobody', () => {
    setAuth({ user: userWithProfile({}) });

    const { result } = renderHook(() => useSession());

    expect(result.current.displayName).toBe('Customer');
  });

  it('uses a generic greeting when there is no user', () => {
    setAuth({ user: null });

    const { result } = renderHook(() => useSession());

    expect(result.current.displayName).toBe('Customer');
  });

  it('signs out at the identity provider', () => {
    const auth = setAuth({ user: oidcUser() });
    const { result } = renderHook(() => useSession());

    result.current.signOut();

    expect(auth.signoutRedirect).toHaveBeenCalledOnce();
  });
});
