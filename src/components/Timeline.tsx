import { formatDateTime, formatDayBadge, formatTime } from '../lib/format';
import styles from './Timeline.module.css';

export interface TimelineItem {
  /** Stable key for the entry. */
  id: string;
  /** ISO 8601 instant at which the step happened. */
  occurredAt: string;
  title: string;
  description?: string;
}

interface TimelineProps {
  items: TimelineItem[];
  /** Accessible name for the list, e.g. "Dispute progress". */
  label: string;
  /** IANA time zone; defaults to the viewer's own. */
  timeZone?: string;
}

/** A vertical progress timeline, oldest step first. The last step is marked as the current one. */
export function Timeline({ items, label, timeZone }: TimelineProps) {
  return (
    <ol className={styles.timeline} aria-label={label}>
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1;
        const badge = formatDayBadge(item.occurredAt, timeZone);
        return (
          <li
            key={item.id}
            className={isCurrent ? `${styles.item} ${styles.current}` : styles.item}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <div className={styles.date} aria-hidden="true">
              <span className={styles.day}>{badge?.day ?? '—'}</span>
              <span className={styles.month}>{badge?.month ?? ''}</span>
            </div>
            <div className={styles.body}>
              <p className={styles.title}>{item.title}</p>
              {item.description ? <p className={styles.description}>{item.description}</p> : null}
              <p className={styles.time}>
                <time dateTime={item.occurredAt}>
                  <span className="visually-hidden">
                    {formatDateTime(item.occurredAt, timeZone)}
                  </span>
                  <span aria-hidden="true">{formatTime(item.occurredAt, timeZone)}</span>
                </time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
