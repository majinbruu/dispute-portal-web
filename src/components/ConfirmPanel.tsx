import { type ReactNode, useEffect, useId, useRef } from 'react';
import styles from './ConfirmPanel.module.css';

interface ConfirmPanelProps {
  /** The question being confirmed, e.g. "Withdraw this dispute?". */
  title: string;
  /** What confirming does, any field it needs, and the confirm and cancel buttons. */
  children: ReactNode;
}

/**
 * An in-page confirmation step, used instead of a browser dialog. It is shown in place of the
 * button that opened it and takes focus, so keyboard and screen reader users land on the question.
 */
export function ConfirmPanel({ title, children }: ConfirmPanelProps) {
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div className={styles.panel} role="group" aria-labelledby={titleId}>
      <h3 id={titleId} ref={titleRef} tabIndex={-1} className={styles.title}>
        {title}
      </h3>
      {children}
    </div>
  );
}
