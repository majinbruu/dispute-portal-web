import { useId, useState } from 'react';
import { useDisputes } from '../../api/queries';
import type { DisputeState } from '../../api/types';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { ItemList, ItemRow } from '../../components/ItemList';
import { PageHeader } from '../../components/PageHeader';
import { Pager } from '../../components/Pager';
import { Spinner } from '../../components/Spinner';
import { formatDateTime, formatMoney } from '../../lib/format';
import { toProblem } from '../../lib/problem';
import { HistoryTabs } from '../debit-orders/HistoryTabs';
import styles from './Disputes.module.css';
import { DISPUTE_STATUS_LABEL, DISPUTE_STATUS_TONE } from './presentation';

const PAGE_SIZE = 5;

interface SectionProps {
  state: DisputeState;
  title: string;
  emptyMessage: string;
}

function DisputeSection({ state, title, emptyMessage }: SectionProps) {
  const headingId = useId();
  const [page, setPage] = useState(1);
  const query = useDisputes({ state, page, pageSize: PAGE_SIZE });

  let content;
  if (query.isPending) {
    content = <Spinner label={`Loading ${title.toLowerCase()} disputes…`} />;
  } else if (query.isError) {
    content = (
      <ErrorState
        problem={toProblem(query.error)}
        title={`We could not load your ${title.toLowerCase()} disputes`}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (query.data.items.length === 0) {
    content = <EmptyState title={emptyMessage} />;
  } else {
    content = (
      <div
        className={query.isPlaceholderData ? `${styles.results} ${styles.stale}` : styles.results}
        aria-busy={query.isPlaceholderData}
      >
        <ItemList label={`${title} disputes`}>
          {query.data.items.map((dispute) => (
            <ItemRow
              key={dispute.id}
              to={`/disputes/${dispute.id}`}
              title={dispute.creditorName}
              subtitle={`${dispute.reference} · ${dispute.reasonDescription}`}
              value={formatMoney(dispute.amount, dispute.currency)}
              meta={formatDateTime(dispute.completedAt ?? dispute.submittedAt)}
              badges={
                <Badge tone={DISPUTE_STATUS_TONE[dispute.status]}>
                  {DISPUTE_STATUS_LABEL[dispute.status]}
                </Badge>
              }
            />
          ))}
        </ItemList>
        <Pager
          label={`${title} disputes`}
          page={query.data.page}
          totalPages={query.data.totalPages}
          onPageChange={setPage}
          disabled={query.isPlaceholderData}
        />
      </div>
    );
  }

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      {content}
    </section>
  );
}

export function DisputeListPage() {
  return (
    <>
      <PageHeader title="Dispute history" />
      <HistoryTabs />
      <DisputeSection state="Pending" title="Pending" emptyMessage="No pending disputes" />
      <DisputeSection state="Completed" title="Completed" emptyMessage="No completed disputes" />
    </>
  );
}
