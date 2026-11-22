import styles from './Spinner.module.css';

interface SpinnerProps {
  /** Announced to screen readers and shown next to the spinner. */
  label?: string;
  /** Compact, single-line variant for use inside other content. */
  inline?: boolean;
}

export function Spinner({ label = 'Loading…', inline = false }: SpinnerProps) {
  return (
    <div
      className={inline ? `${styles.wrapper} ${styles.inline}` : styles.wrapper}
      role="status"
      aria-live="polite"
    >
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
