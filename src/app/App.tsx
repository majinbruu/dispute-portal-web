import { AuthProvider } from '../auth/AuthProvider';
import { RequireAuth } from '../auth/RequireAuth';
import { AuthenticatedApp } from './AuthenticatedApp';
import { ErrorBoundary } from './ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RequireAuth>
          <AuthenticatedApp />
        </RequireAuth>
      </AuthProvider>
    </ErrorBoundary>
  );
}
