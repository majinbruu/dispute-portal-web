import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../components/Button';
import { ConfigError } from '../lib/config';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: unknown;
}

/**
 * Last line of defence: catches render errors anywhere below it (including a missing or invalid
 * runtime configuration) and shows a recoverable screen instead of a blank page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: undefined };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Unhandled application error', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error === undefined) {
      return this.props.children;
    }
    const isConfigError = error instanceof ConfigError;
    return (
      <main className={styles.crash} role="alert">
        <h1>{isConfigError ? 'ACME Bank is not available' : 'Something went wrong'}</h1>
        <p className={styles.message}>
          {isConfigError
            ? 'The application could not load its configuration. Please try again later.'
            : 'An unexpected error stopped this page from working. Reload to try again.'}
        </p>
        <Button
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload
        </Button>
      </main>
    );
  }
}
