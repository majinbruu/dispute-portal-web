import type { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  /** Optional heading; when given the card becomes a labelled section. */
  title?: string;
  children: ReactNode;
}

export function Card({ title, children }: CardProps) {
  if (!title) {
    return <div className={styles.card}>{children}</div>;
  }
  return (
    <section className={styles.card} aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
