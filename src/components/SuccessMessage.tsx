import { type ReactNode, useEffect, useRef } from 'react';
import styles from './SuccessMessage.module.css';

/**
 * Confirms that an action worked. It takes focus when it appears, because the control that was
 * used has usually just left the page and focus would otherwise be lost.
 */
export function SuccessMessage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <p ref={ref} className={styles.message} role="status" tabIndex={-1}>
      {children}
    </p>
  );
}
