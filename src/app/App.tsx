import { AuthProvider } from '../auth/AuthProvider';
import { RequireAuth } from '../auth/RequireAuth';
import { useSession } from '../auth/useSession';
import { Button } from '../components/Button';

function SignedIn() {
  const { displayName, signOut } = useSession();
  return (
    <main>
      <h1>ACME Bank</h1>
      <p>Signed in as {displayName}</p>
      <Button variant="secondary" onClick={signOut}>
        Sign out
      </Button>
    </main>
  );
}

export function App() {
  return (
    <AuthProvider>
      <RequireAuth>
        <SignedIn />
      </RequireAuth>
    </AuthProvider>
  );
}
