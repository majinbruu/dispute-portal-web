import type { ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './ItemList.module.css';

interface ItemListProps {
  /** Accessible name for the list, e.g. "Debit orders". */
  label: string;
  children: ReactNode;
}

/** A list of navigable rows: the mobile-first alternative to a data table. */
export function ItemList({ label, children }: ItemListProps) {
  return (
    <ul className={styles.list} aria-label={label}>
      {children}
    </ul>
  );
}

interface ItemRowProps {
  /** Route the row's main link goes to. */
  to: string;
  title: string;
  subtitle?: ReactNode;
  /** Prominent right-aligned value, usually an amount. */
  value?: ReactNode;
  /** Secondary right-aligned text, usually a date. */
  meta?: ReactNode;
  /** Badges shown under the row. */
  badges?: ReactNode;
  /**
   * A further link or button for the row. It is rendered beside the main link, not inside it,
   * because interactive elements must not be nested.
   */
  action?: ReactNode;
}

export function ItemRow({ to, title, subtitle, value, meta, badges, action }: ItemRowProps) {
  return (
    <li className={styles.row}>
      <Link to={to} className={styles.link}>
        <span className={styles.main}>
          <span className={styles.title}>{title}</span>
          {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
        </span>
        {value || meta ? (
          <span className={styles.aside}>
            {value ? <span className={styles.value}>{value}</span> : null}
            {meta ? <span className={styles.meta}>{meta}</span> : null}
          </span>
        ) : null}
        {badges ? <span className={styles.badges}>{badges}</span> : null}
      </Link>
      {action ? <div className={styles.action}>{action}</div> : null}
    </li>
  );
}
