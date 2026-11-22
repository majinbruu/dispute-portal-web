import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

/** A small status label. Meaning is always carried by the text, never by colour alone. */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`} data-tone={tone}>
      {children}
    </span>
  );
}
