import type { ReactNode } from 'react';
import styles from './DescriptionList.module.css';

export interface DescriptionItem {
  label: string;
  value: ReactNode;
}

interface DescriptionListProps {
  items: DescriptionItem[];
}

/** Label / value pairs for a detail screen. Items whose value is null or empty are left out. */
export function DescriptionList({ items }: DescriptionListProps) {
  const visible = items.filter(
    (item) => item.value !== null && item.value !== undefined && item.value !== '',
  );
  return (
    <dl className={styles.list}>
      {visible.map((item) => (
        <div key={item.label} className={styles.row}>
          <dt className={styles.term}>{item.label}</dt>
          <dd className={styles.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
