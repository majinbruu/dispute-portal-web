import { useId, useState } from 'react';
import { useAgentDisputes } from '../../api/queries';
import type { AgentDisputeSummary } from '../../api/types';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { ItemList, ItemRow } from '../../components/ItemList';
import { PageHeader } from '../../components/PageHeader';
import { Pager } from '../../components/Pager';
import { Spinner } from '../../components/Spinner';
import { formatDateTime, formatMoney } from '../../lib/format';
import { disputeReasonLabel, disputeStatusLabel, transactionTypeLabel } from '../../lib/labels';
import { toProblem } from '../../lib/problem';
import { DISPUTE_STATUS_TONE } from '../disputes/presentation';
import styles from './Agent.module.css';
import {
  type AgentQueueFilterState,
  DISPUTE_STATUSES,
  DISPUTED_TRANSACTION_TYPES,
  REFERENCE_MAX_LENGTH,
  useAgentQueueFilters,
} from './useAgentQueueFilters';

const LIST_LABEL = 'Disputes';

interface ReferenceSearchProps {
  /** The reference the queue is filtered by now. */
  applied: string;
  onSearch: (reference: string) => void;
}

/**
 * Searching happens when the form is submitted, not on every keystroke, so the queue does not
 * reload under the agent while they type.
 */
function ReferenceSearch({ applied, onSearch }: ReferenceSearchProps) {
  const id = useId();
  const [reference, setReference] = useState(applied);
  const [lastApplied, setLastApplied] = useState(applied);
  // When the applied reference changes from outside (the filters were cleared, or the back
  // button was used), the field follows it. Remounting the field instead would drop focus.
  if (applied !== lastApplied) {
    setLastApplied(applied);
    setReference(applied);
  }
  return (
    <form
      className={styles.search}
      role="search"
      aria-label="Search disputes by reference"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(reference);
      }}
    >
      <div className={styles.field}>
        <label className={styles.label} htmlFor={id}>
          Dispute reference
        </label>
        <input
          id={id}
          className={styles.input}
          type="search"
          maxLength={REFERENCE_MAX_LENGTH}
          placeholder="For example DSP-2026"
          value={reference}
          onChange={(event) => {
            setReference(event.target.value);
          }}
        />
      </div>
      <Button type="submit" variant="secondary">
        Search
      </Button>
    </form>
  );
}

function Filters({ filters, setFilter }: Pick<AgentQueueFilterState, 'filters' | 'setFilter'>) {
  const id = useId();
  return (
    <div className={styles.filters}>
      <form
        className={styles.selects}
        aria-label="Filter disputes"
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
            className={styles.input}
            value={filters.status ?? ''}
            onChange={(event) => {
              setFilter('status', event.target.value);
            }}
          >
            <option value="">All statuses</option>
            {DISPUTE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {disputeStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${id}-type`}>
            Transaction type
          </label>
          <select
            id={`${id}-type`}
            className={styles.input}
            value={filters.transactionType ?? ''}
            onChange={(event) => {
              setFilter('type', event.target.value);
            }}
          >
            <option value="">All types</option>
            {DISPUTED_TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {transactionTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>
      </form>
      <ReferenceSearch
        applied={filters.reference ?? ''}
        onSearch={(reference) => {
          setFilter('reference', reference);
        }}
      />
    </div>
  );
}

function DisputeRow({ dispute }: { dispute: AgentDisputeSummary }) {
  return (
    <ItemRow
      to={`/agent/disputes/${dispute.id}`}
      title={dispute.reference}
      subtitle={`${dispute.counterpartyName} · ${disputeReasonLabel(dispute.reasonLabel, dispute.reasonCode)}`}
      value={formatMoney(dispute.amount, dispute.currency)}
      meta={`Submitted ${formatDateTime(dispute.submittedAt)}`}
      badges={
        <>
          <Badge>{transactionTypeLabel(dispute.transactionType)}</Badge>
          <Badge tone={DISPUTE_STATUS_TONE[dispute.status]}>
            {disputeStatusLabel(dispute.status)}
          </Badge>
        </>
      }
    />
  );
}

function Results({ state }: { state: AgentQueueFilterState }) {
  const { filters, hasFilters, setPage, clearFilters } = state;
  const query = useAgentDisputes(filters);

  if (query.isPending) {
    return <Spinner label="Loading disputes…" />;
  }
  if (query.isError) {
    return (
      <ErrorState
        problem={toProblem(query.error)}
        title="We could not load the disputes"
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { items, page, totalPages, totalItems } = query.data;
  if (items.length === 0) {
    return (
      <EmptyState
        title={hasFilters ? 'No disputes match your filters' : 'No disputes yet'}
        description={
          hasFilters ? undefined : 'Disputes raised by customers will appear here for review.'
        }
        action={
          hasFilters ? (
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
        {totalItems} {totalItems === 1 ? 'dispute' : 'disputes'}
      </p>
      <ItemList label={LIST_LABEL}>
        {items.map((dispute) => (
          <DisputeRow key={dispute.id} dispute={dispute} />
        ))}
      </ItemList>
      <Pager
        label={LIST_LABEL}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        disabled={query.isPlaceholderData}
      />
    </div>
  );
}

/** The agent's home: every customer's disputes, with the ones waiting for review first. */
export function AgentQueuePage() {
  const state = useAgentQueueFilters();
  return (
    <>
      <PageHeader
        title="Dispute queue"
        description="Disputes from all customers. Those waiting for review come first, oldest first."
      />
      <Filters filters={state.filters} setFilter={state.setFilter} />
      <Results state={state} />
    </>
  );
}
