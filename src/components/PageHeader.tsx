import { Link } from 'react-router';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Link to the parent screen. */
  back?: { to: string; label: string };
}

export function PageHeader({ title, description, back }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      {back ? (
        <Link to={back.to} className={styles.back}>
          <span aria-hidden="true">←</span> {back.label}
        </Link>
      ) : null}
      <h1>{title}</h1>
      {description ? <p className={styles.description}>{description}</p> : null}
    </header>
  );
}
