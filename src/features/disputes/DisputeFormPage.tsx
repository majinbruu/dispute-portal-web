import { useParams } from 'react-router';
import { useDisputeReasons, useTransaction } from '../../api/queries';
import type { Transaction } from '../../api/types';
import { ButtonLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { formatDate, formatMoney } from '../../lib/format';
import { transactionTypeNoun } from '../../lib/labels';
import { toProblem } from '../../lib/problem';
import { transactionSummary } from '../transactions/presentation';
import { DisputeForm } from './DisputeForm';
import styles from './Disputes.module.css';

const TITLE = 'Dispute a transaction';

function TransactionSummary({ transaction }: { transaction: Transaction }) {
  const summary = transactionSummary(transaction);
  const date = formatDate(transaction.effectiveDate);
  return (
    <Card>
      <div className={styles.summary}>
        <div>
          <p className={styles.summaryName}>{transaction.counterpartyName}</p>
          <p className={styles.note}>{summary ? `${summary} · ${date}` : date}</p>
        </div>
        <p className={styles.summaryAmount}>
          {formatMoney(transaction.amount, transaction.currency)}
        </p>
      </div>
    </Card>
  );
}

function Reasons({ transaction }: { transaction: Transaction }) {
  const query = useDisputeReasons(transaction.id);

  if (query.isPending) {
    return <Spinner label="Loading dispute reasons…" />;
  }
  if (query.isError) {
    return (
      <ErrorState
        problem={toProblem(query.error)}
        title="We could not load the dispute reasons"
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (query.data.length === 0) {
    return (
      <EmptyState
        title={`This ${transactionTypeNoun(transaction.type)} cannot be disputed online`}
        description="No dispute reasons are available for this transaction."
      />
    );
  }
  return <DisputeForm transaction={transaction} reasons={query.data} />;
}

export function DisputeFormPage() {
  const { id = '' } = useParams();
  const back = { to: `/transactions/${id}`, label: 'Transaction' };
  const query = useTransaction(id);

  if (query.isPending) {
    return (
      <>
        <PageHeader title={TITLE} back={back} />
        <Spinner label="Loading transaction…" />
      </>
    );
  }
  if (query.isError) {
    return (
      <>
        <PageHeader title={TITLE} back={back} />
        <ErrorState
          problem={toProblem(query.error)}
          title="We could not load this transaction"
          onRetry={() => void query.refetch()}
        />
      </>
    );
  }

  const transaction = query.data;
  const noun = transactionTypeNoun(transaction.type);
  // The API decides eligibility; the form is only offered when it says the transaction can be
  // disputed. No screen links here otherwise, so this is only reached from a stale or typed URL.
  if (!transaction.eligibility.canDispute) {
    return (
      <>
        <PageHeader title={TITLE} back={back} />
        <div className={styles.stack}>
          <TransactionSummary transaction={transaction} />
          <EmptyState
            title={`This ${noun} cannot be disputed`}
            description={transaction.eligibility.message}
            action={
              transaction.dispute ? (
                <ButtonLink to={`/disputes/${transaction.dispute.id}`}>
                  View dispute progress
                </ButtonLink>
              ) : (
                <ButtonLink to={back.to} variant="secondary">
                  Back to {noun}
                </ButtonLink>
              )
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={TITLE} back={back} />
      <div className={styles.stack}>
        <TransactionSummary transaction={transaction} />
        <Reasons transaction={transaction} />
      </div>
    </>
  );
}
