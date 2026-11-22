import { useId } from 'react';
import { useDebitOrders } from '../../api/queries';
import { DEBIT_ORDER_SORTS, type DebitOrder } from '../../api/types';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { ItemList, ItemRow } from '../../components/ItemList';
import { PageHeader } from '../../components/PageHeader';
import { Pager } from '../../components/Pager';
import { Spinner } from '../../components/Spinner';
import { formatDate, formatMoney } from '../../lib/format';
import { toProblem } from '../../lib/problem';
import styles from './DebitOrders.module.css';
import { HistoryTabs } from './HistoryTabs';
import { disputabilityBadge, MANDATE_TYPE_LABEL, SORT_LABEL, STATUS_TONE } from './presentation';
import { type DebitOrderFilterState, useDebitOrderFilters } from './useDebitOrderFilters';

function Filters({ filters, setFilter }: Pick<DebitOrderFilterState, 'filters' | 'setFilter'>) {
  const id = useId();
  return (
    <form
      className={styles.filters}
      aria-label="Filter debit orders"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${id}-status`}>
          Status
        </label>
        <select
          id={`${id}-status`}
          className={styles.select}
          value={filters.status ?? ''}
          onChange={(event) => {
            setFilter('status', event.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="Successful">Successful</option>
          <option value="Failed">Failed</option>
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${id}-mandate-type`}>
          Mandate type
        </label>
        <select
          id={`${id}-mandate-type`}
          className={styles.select}
          value={filters.mandateType ?? ''}
          onChange={(event) => {
            setFilter('mandateType', event.target.value);
          }}
        >
          <option value="">All mandate types</option>
          <option value="DebiCheck">{MANDATE_TYPE_LABEL.DebiCheck}</option>
          <option value="Registered">{MANDATE_TYPE_LABEL.Registered}</option>
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${id}-sort`}>
          Sort by
        </label>
        <select
          id={`${id}-sort`}
          className={styles.select}
          value={filters.sort}
          onChange={(event) => {
            setFilter('sort', event.target.value);
          }}
        >
          {DEBIT_ORDER_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABEL[sort]}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}

function DebitOrderRow({ order }: { order: DebitOrder }) {
  const disputability = disputabilityBadge(order);
  return (
    <ItemRow
      to={`/debit-orders/${order.id}`}
      title={order.creditorName}
      subtitle={order.statementText}
      value={formatMoney(order.amount, order.currency)}
      meta={formatDate(order.actionDate)}
      badges={
        <>
          <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
          <Badge>{MANDATE_TYPE_LABEL[order.mandateType]}</Badge>
          <Badge tone={disputability.tone}>{disputability.label}</Badge>
        </>
      }
    />
  );
}

function Results({ state }: { state: DebitOrderFilterState }) {
  const { filters, hasActiveFilters, setPage, clearFilters } = state;
  const query = useDebitOrders(filters);

  if (query.isPending) {
    return <Spinner label="Loading your debit orders…" />;
  }
  if (query.isError) {
    return (
      <ErrorState
        problem={toProblem(query.error)}
        title="We could not load your debit orders"
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { items, page, totalPages, totalItems } = query.data;
  if (items.length === 0) {
    return (
      <EmptyState
        title="No debit order history"
        description={
          hasActiveFilters
            ? 'No debit orders match the filters you selected.'
            : 'Debit orders collected from your account will appear here.'
        }
        action={
          hasActiveFilters ? (
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div
      className={query.isPlaceholderData ? `${styles.results} ${styles.stale}` : styles.results}
      aria-busy={query.isPlaceholderData}
    >
      <p className={styles.count}>
        {totalItems} debit {totalItems === 1 ? 'order' : 'orders'}
      </p>
      <ItemList label="Debit orders">
        {items.map((order) => (
          <DebitOrderRow key={order.id} order={order} />
        ))}
      </ItemList>
      <Pager
        label="Debit orders"
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        disabled={query.isPlaceholderData}
      />
    </div>
  );
}

export function DebitOrderListPage() {
  const state = useDebitOrderFilters();
  return (
    <>
      <PageHeader title="Debit orders" />
      <HistoryTabs />
      <Filters filters={state.filters} setFilter={state.setFilter} />
      <Results state={state} />
    </>
  );
}
