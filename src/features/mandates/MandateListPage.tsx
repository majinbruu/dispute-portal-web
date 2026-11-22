import { useState } from 'react';
import { useMandates } from '../../api/queries';
import type { MandateType } from '../../api/types';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { ItemList, ItemRow } from '../../components/ItemList';
import { PageHeader } from '../../components/PageHeader';
import { Pager } from '../../components/Pager';
import { Spinner } from '../../components/Spinner';
import { formatMoney } from '../../lib/format';
import { toProblem } from '../../lib/problem';
import styles from './Mandates.module.css';
import { MANDATE_STATUS_TONE, MANDATE_TYPE_VIEWS } from './presentation';

const PAGE_SIZE = 10;
const BACK = { to: '/mandates', label: 'Debit order mandates' };

function Results({ type }: { type: MandateType }) {
  const view = MANDATE_TYPE_VIEWS[type];
  const [page, setPage] = useState(1);
  const query = useMandates({ type, page, pageSize: PAGE_SIZE });

  if (query.isPending) {
    return <Spinner label="Loading your mandates…" />;
  }
  if (query.isError) {
    return (
      <ErrorState
        problem={toProblem(query.error)}
        title="We could not load your mandates"
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (query.data.items.length === 0) {
    return <EmptyState title={view.emptyMessage} />;
  }

  return (
    <div
      className={query.isPlaceholderData ? `${styles.results} ${styles.stale}` : styles.results}
      aria-busy={query.isPlaceholderData}
    >
      <ItemList label={view.title}>
        {query.data.items.map((mandate) => (
          <ItemRow
            key={mandate.id}
            to={`/mandates/${mandate.id}`}
            title={mandate.creditorName}
            subtitle={`Reference ${mandate.mandateReference}`}
            value={formatMoney(mandate.instalmentAmount, mandate.currency)}
            meta={mandate.frequency}
            badges={<Badge tone={MANDATE_STATUS_TONE[mandate.status]}>{mandate.status}</Badge>}
          />
        ))}
      </ItemList>
      <Pager
        label={view.title}
        page={query.data.page}
        totalPages={query.data.totalPages}
        onPageChange={setPage}
        disabled={query.isPlaceholderData}
      />
    </div>
  );
}

export function MandateListPage({ type }: { type: MandateType }) {
  const view = MANDATE_TYPE_VIEWS[type];
  return (
    <>
      <PageHeader title={view.title} description={view.description} back={BACK} />
      {/* Keyed by type so paging resets when switching between the two lists. */}
      <Results key={type} type={type} />
    </>
  );
}
