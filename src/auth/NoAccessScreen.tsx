import { Button } from '../components/Button';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './SignInScreen.module.css';
import { useSession } from './useSession';

/**
 * Shown to a signed-in user whose account is neither a customer nor an agent. The only thing to
 * do here is sign out, so that a different account can be used.
 */
export function NoAccessScreen() {
  const { displayName, signOut } = useSession();
  useDocumentTitle('No access');
  return (
    <main className={styles.screen}>
      <div className={styles.panel}>
        <p className={styles.brand}>ACME Bank</p>
        <h1 className={styles.product}>You do not have access</h1>
        <p className={styles.intro}>
          You are signed in as {displayName}, but this account is not set up to use the dispute
          portal as a customer or as an agent. Sign out to use a different account, or contact ACME
          Bank for help.
        </p>
        <Button block onClick={signOut}>
          Sign out
        </Button>
      </div>
    </main>
  );
}
