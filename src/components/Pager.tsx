import { Button } from './Button';
import styles from './Pager.module.css';

interface PagerProps {
  /** Current page, 1-based. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Names the list being paged, e.g. "Debit orders". */
  label: string;
  /** Disables the controls while the next page is loading. */
  disabled?: boolean;
}

/** Previous / next paging. Renders nothing when there is only one page. */
export function Pager({ page, totalPages, onPageChange, label, disabled = false }: PagerProps) {
  if (totalPages <= 1) return null;

  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <nav className={styles.pager} aria-label={`${label} pages`}>
      <Button
        variant="secondary"
        disabled={disabled || isFirst}
        onClick={() => {
          onPageChange(page - 1);
        }}
      >
        Previous
      </Button>
      <p className={styles.status} aria-live="polite">
        Page {page} of {totalPages}
      </p>
      <Button
        variant="secondary"
        disabled={disabled || isLast}
        onClick={() => {
          onPageChange(page + 1);
        }}
      >
        Next
      </Button>
    </nav>
  );
}
