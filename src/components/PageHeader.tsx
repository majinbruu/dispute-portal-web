import { Link } from 'react-router';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Link to the parent screen. */
  back?: { to: string; label: string };
}

/** The heading of a screen. Also sets the document title so tabs and history are meaningful. */
export function PageHeader({ title, description, back }: PageHeaderProps) {
  useDocumentTitle(title);
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
