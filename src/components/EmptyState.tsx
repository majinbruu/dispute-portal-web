import type { ReactNode } from 'react';
import styles from './StateMessage.module.css';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional call to action, e.g. a link to another screen. */
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.state}>
      <p className={styles.title}>{title}</p>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.actions}>{action}</div> : null}
    </div>
  );
}
