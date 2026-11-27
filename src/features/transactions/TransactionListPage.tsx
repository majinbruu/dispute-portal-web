import { useId } from 'react';
import { useTransactions } from '../../api/queries';
import { type Transaction, TRANSACTION_SORTS, type TransactionType } from '../../api/types';
import { Badge } from '../../components/Badge';
import { Button, ButtonLink } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { ItemList, ItemRow } from '../../components/ItemList';
import { PageHeader } from '../../components/PageHeader';
import { Pager } from '../../components/Pager';
import { Spinner } from '../../components/Spinner';
import { TabPanel, Tabs } from '../../components/Tabs';
import { formatDate, formatMoney, humanizeEnum } from '../../lib/format';
import { disputeStatusLabel, mandateTypeLabel, transactionTypeNoun } from '../../lib/labels';
import { toProblem } from '../../lib/problem';
import { HistoryTabs } from './HistoryTabs';
import {
  CARD_STATUS_TONE,
  DEBIT_ORDER_STATUS_TONE,
  SORT_LABEL,
  transactionSummary,
} from './presentation';
import styles from './Transactions.module.css';
import {
  CARD_STATUSES,
  DEBIT_ORDER_STATUSES,
  MANDATE_TYPES,
  type TransactionFilterState,
  useTransactionFilters,
} from './useTransactionFilters';

const TYPE_TABS: readonly { id: TransactionType; label: string }[] = [
  { id: 'DebitOrder', label: 'Debit orders' },
  { id: 'Card', label: 'Card' },
];

/** The words each list uses for itself, so the two tabs read naturally. */
interface ListWording {
  /** Accessible name of the list and its pager. */
  label: string;
  /** The transactions being counted, e.g. `DebiCheck debit order`. */
  singular: string;
  plural: string;
  emptyTitle: string;
  emptyDescription: string;
}

function wordingFor(filters: TransactionFilterState['filters']): ListWording {
  if (filters.type === 'Card') {
    return {
      label: 'Card transactions',
      singular: 'card transaction',
      plural: 'card transactions',
      emptyTitle: 'No card transactions',
      emptyDescription: 'Purchases and withdrawals made with your card will appear here.',
    };
  }
  const typeLabel = mandateTypeLabel(filters.mandateType);
  return {
    label: 'Debit orders',
    singular: `${typeLabel} debit order`,
    plural: `${typeLabel} debit orders`,
    emptyTitle: 'No debit order history',
    emptyDescription: `${typeLabel} debit orders collected from your account will appear here.`,
  };
}

function Filters({ filters, setFilter }: Pick<TransactionFilterState, 'filters' | 'setFilter'>) {
  const id = useId();
  const statuses = filters.type === 'Card' ? CARD_STATUSES : DEBIT_ORDER_STATUSES;
  return (
    <form
      className={styles.filters}
      aria-label={filters.type === 'Card' ? 'Filter card transactions' : 'Filter debit orders'}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      {filters.type === 'DebitOrder' ? (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${id}-mandate-type`}>
            Mandate type
          </label>
          <select
            id={`${id}-mandate-type`}
            className={styles.select}
            value={filters.mandateType}
            onChange={(event) => {
              setFilter('mandateType', event.target.value);
            }}
          >
            {MANDATE_TYPES.map((type) => (
              <option key={type} value={type}>
                {mandateTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
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
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
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
          {TRANSACTION_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABEL[sort]}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}

/**
 * The row's own action, next to (never inside) the link to the detail page: Dispute when the
 * API says the transaction can be disputed, or a way to the dispute that already exists.
 */
function rowAction(transaction: Transaction) {
  if (transaction.eligibility.canDispute) {
    return (
      <ButtonLink
        to={`/transactions/${transaction.id}/dispute`}
        size="small"
        aria-label={`Dispute ${transaction.counterpartyName} ${transactionTypeNoun(transaction.type)} of ${formatDate(transaction.effectiveDate)}`}
      >
        Dispute
      </ButtonLink>
    );
  }
  if (transaction.dispute) {
    return (
      <ButtonLink
        to={`/disputes/${transaction.dispute.id}`}
        variant="secondary"
        size="small"
        aria-label={`View dispute ${transaction.dispute.reference}`}
      >
        View dispute
      </ButtonLink>
    );
  }
  return undefined;
}

/** What tells one row from the next differs by type: the mandate for a debit order, the kind for a card. */
function typeBadges({ debitOrder, card }: Transaction) {
  if (debitOrder) {
    return (
      <>
        <Badge>{mandateTypeLabel(debitOrder.mandateType)}</Badge>
        <Badge tone={DEBIT_ORDER_STATUS_TONE[debitOrder.status]}>{debitOrder.status}</Badge>
      </>
    );
  }
  if (card) {
    return (
      <>
        <Badge>{humanizeEnum(card.kind)}</Badge>
        <Badge tone={CARD_STATUS_TONE[card.status]}>{card.status}</Badge>
      </>
    );
  }
  return null;
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  return (
    <ItemRow
      to={`/transactions/${transaction.id}`}
      title={transaction.counterpartyName}
      subtitle={transactionSummary(transaction)}
      value={formatMoney(transaction.amount, transaction.currency)}
      meta={formatDate(transaction.effectiveDate)}
      badges={
        <>
          {typeBadges(transaction)}
          {transaction.dispute ? (
            <Badge tone="info">
              Dispute: {disputeStatusLabel(transaction.dispute.status).toLowerCase()}
            </Badge>
          ) : null}
        </>
      }
      action={rowAction(transaction)}
    />
  );
}

function Results({ state }: { state: TransactionFilterState }) {
  const { filters, hasStatusFilter, setPage, clearStatusFilter } = state;
  const query = useTransactions(filters);
  const wording = wordingFor(filters);

  if (query.isPending) {
    return <Spinner label={`Loading your ${wording.label.toLowerCase()}…`} />;
  }
  if (query.isError) {
    return (
      <ErrorState
        problem={toProblem(query.error)}
        title={`We could not load your ${wording.label.toLowerCase()}`}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { items, page, totalPages, totalItems } = query.data;
  if (items.length === 0) {
    return (
      <EmptyState
        title={wording.emptyTitle}
        description={
          hasStatusFilter
            ? `No ${wording.plural} have the status you selected.`
            : wording.emptyDescription
        }
        action={
          hasStatusFilter ? (
            <Button variant="secondary" onClick={clearStatusFilter}>
              Show all statuses
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
        {totalItems} {totalItems === 1 ? wording.singular : wording.plural}
      </p>
      <ItemList label={wording.label}>
        {items.map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} />
        ))}
      </ItemList>
      <Pager
        label={wording.label}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        disabled={query.isPlaceholderData}
      />
    </div>
  );
}

export function TransactionListPage() {
  const tabsId = useId();
  const state = useTransactionFilters();
  const { type } = state.filters;
  return (
    <>
      <PageHeader title="Transactions" />
      <HistoryTabs />
      <Tabs
        idBase={tabsId}
        label="Transaction type"
        tabs={TYPE_TABS}
        selected={type}
        onSelect={state.setType}
      />
      <TabPanel idBase={tabsId} selected={type}>
        <Filters filters={state.filters} setFilter={state.setFilter} />
        <Results state={state} />
      </TabPanel>
    </>
  );
}
