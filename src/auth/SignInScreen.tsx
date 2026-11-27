import { Button } from '../components/Button';
import styles from './SignInScreen.module.css';

interface SignInScreenProps {
  onSignIn: () => void;
  /** True while the redirect to the identity provider is starting. */
  busy?: boolean;
  /** Shown when the last sign-in attempt failed. */
  errorMessage?: string;
}

export function SignInScreen({ onSignIn, busy = false, errorMessage }: SignInScreenProps) {
  return (
    <main className={styles.screen}>
      <div className={styles.panel}>
        <h1 className={styles.brand}>ACME Bank</h1>
        <p className={styles.product}>Transaction disputes</p>
        <p className={styles.intro}>
          Sign in to view your debit orders, card transactions and mandates, dispute a transaction
          and follow the progress of your disputes.
        </p>
        {errorMessage ? (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        ) : null}
        <Button block onClick={onSignIn} disabled={busy}>
          {busy ? 'Redirecting…' : 'Sign in'}
        </Button>
      </div>
    </main>
  );
}
