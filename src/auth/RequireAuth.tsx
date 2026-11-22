import { type ReactNode, useEffect } from 'react';
import { hasAuthParams, useAuth } from 'react-oidc-context';
import { Spinner } from '../components/Spinner';
import { currentReturnTo } from './returnTo';
import { SignInScreen } from './SignInScreen';
import styles from './SignInScreen.module.css';

const SIGN_IN_FAILED = 'We could not sign you in. Please try again.';

/**
 * Gate for everything that needs a signed-in customer. It never redirects on its own: an
 * unauthenticated visitor sees the sign-in screen and starts the redirect with a button, which
 * rules out redirect loops when the identity provider is misconfigured or unavailable.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const failed = auth.error !== undefined && !auth.isAuthenticated;

  useEffect(() => {
    // A failed callback leaves `code`/`state` (or `error`) in the URL; remove them so a reload
    // does not replay the failed exchange.
    if (failed && hasAuthParams()) {
      window.history.replaceState({}, document.title, currentReturnTo(window.location));
    }
  }, [failed]);

  if (auth.isAuthenticated) {
    return children;
  }

  if (auth.isLoading && !failed) {
    return (
      <main className={styles.loading}>
        <Spinner label="Signing you in…" />
      </main>
    );
  }

  const redirecting = auth.activeNavigator === 'signinRedirect';

  return (
    <SignInScreen
      busy={redirecting}
      errorMessage={failed ? SIGN_IN_FAILED : undefined}
      onSignIn={() => {
        void auth.signinRedirect({ state: { returnTo: currentReturnTo(window.location) } });
      }}
    />
  );
}
