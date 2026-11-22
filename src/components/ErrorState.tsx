import type { ReactNode } from 'react';
import { type Problem, validationMessages } from '../lib/problem';
import { Button } from './Button';
import styles from './StateMessage.module.css';

interface ErrorStateProps {
  problem: Problem;
  /** Overrides the problem title, e.g. with a message specific to the screen. */
  title?: string;
  onRetry?: () => void;
  /** Extra actions such as a link away from the failed screen. */
  action?: ReactNode;
}

/**
 * Shows an API problem: the customer-safe detail, any field messages, and the trace ID in small
 * print so it can be quoted to support.
 */
export function ErrorState({ problem, title, onRetry, action }: ErrorStateProps) {
  const fieldMessages = validationMessages(problem);
  return (
    <div className={`${styles.state} ${styles.error}`} role="alert">
      <p className={styles.title}>{title ?? problem.title}</p>
      <p className={styles.description}>{problem.detail}</p>
      {fieldMessages.length > 0 ? (
        <ul className={styles.list}>
          {fieldMessages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
      {onRetry || action ? (
        <div className={styles.actions}>
          {onRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
          {action}
        </div>
      ) : null}
      {problem.traceId ? (
        <p className={styles.trace}>
          Reference for support: <code>{problem.traceId}</code>
        </p>
      ) : null}
    </div>
  );
}
