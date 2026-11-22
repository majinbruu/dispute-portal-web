import { useId, useState } from 'react';
import { useMarkNotificationRead, useNotifications, useUnreadCount } from '../../api/queries';
import type { Notification } from '../../api/types';
import { Badge, type BadgeTone } from '../../components/Badge';
import { ButtonLink } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { Pager } from '../../components/Pager';
import { Spinner } from '../../components/Spinner';
import { formatDateTime } from '../../lib/format';
import { toProblem } from '../../lib/problem';
import styles from './Inbox.module.css';

const PAGE_SIZE = 10;

const CATEGORY: Record<Notification['category'], { label: string; tone: BadgeTone }> = {
  DisputeReceived: { label: 'Dispute received', tone: 'info' },
  DisputeInProgress: { label: 'Dispute in progress', tone: 'warning' },
  DisputeRefunded: { label: 'Dispute refunded', tone: 'success' },
  DisputeDeclined: { label: 'Dispute declined', tone: 'danger' },
};

interface NotificationItemProps {
  notification: Notification;
  onOpen: (notification: Notification) => void;
}

function NotificationItem({ notification, onOpen }: NotificationItemProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const category = CATEGORY[notification.category];

  return (
    <li className={notification.isRead ? styles.item : `${styles.item} ${styles.unread}`}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (!open) onOpen(notification);
          setOpen(!open);
        }}
      >
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.title}>
          {notification.isRead ? null : <span className="visually-hidden">Unread: </span>}
          {notification.title}
        </span>
        <time className={styles.time} dateTime={notification.createdAt}>
          {formatDateTime(notification.createdAt)}
        </time>
        <span className={styles.chevron} aria-hidden="true">
          {open ? 'Hide message' : 'Read message'}
        </span>
      </button>
      <div id={panelId} className={styles.panel} hidden={!open}>
        <Badge tone={category.tone}>{category.label}</Badge>
        <p>{notification.body}</p>
        {notification.relatedDisputeId ? (
          <ButtonLink to={`/disputes/${notification.relatedDisputeId}`} variant="secondary">
            View dispute
          </ButtonLink>
        ) : null}
      </div>
    </li>
  );
}

function Notifications() {
  const [page, setPage] = useState(1);
  const query = useNotifications({ page, pageSize: PAGE_SIZE });
  const unread = useUnreadCount();
  const markRead = useMarkNotificationRead();

  if (query.isPending) {
    return <Spinner label="Loading your inbox…" />;
  }
  if (query.isError) {
    return (
      <ErrorState
        problem={toProblem(query.error)}
        title="We could not load your inbox"
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (query.data.items.length === 0) {
    return (
      <EmptyState
        title="Your inbox is empty"
        description="Updates about your disputes will appear here."
      />
    );
  }

  return (
    <div
      className={query.isPlaceholderData ? `${styles.results} ${styles.stale}` : styles.results}
      aria-busy={query.isPlaceholderData}
    >
      {unread.data !== undefined ? (
        <p className={styles.count} aria-live="polite">
          {unread.data === 0 ? 'No unread messages' : `${unread.data} unread`}
        </p>
      ) : null}
      {markRead.isError ? (
        <ErrorState
          problem={toProblem(markRead.error)}
          title="We could not mark that message as read"
        />
      ) : null}
      <ul className={styles.list} aria-label="Notifications">
        {query.data.items.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onOpen={(opened) => {
              // Opening a message is what reads it; the API call is safe to repeat.
              if (!opened.isRead) markRead.mutate(opened.id);
            }}
          />
        ))}
      </ul>
      <Pager
        label="Notifications"
        page={query.data.page}
        totalPages={query.data.totalPages}
        onPageChange={setPage}
        disabled={query.isPlaceholderData}
      />
    </div>
  );
}

export function InboxPage() {
  return (
    <>
      <PageHeader title="Inbox" description="Messages about your disputes, newest first." />
      <Notifications />
    </>
  );
}
