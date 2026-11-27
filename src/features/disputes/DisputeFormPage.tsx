import { Navigate, useParams } from 'react-router';
import { useDisputeReasons, useTransaction } from '../../api/queries';
import type { Transaction } from '../../api/types';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { formatDate, formatMoney } from '../../lib/format';
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
  // No reason to choose means there is no dispute to raise, so there is no form to show either.
  if (query.data.length === 0) {
    return <Navigate to={`/transactions/${transaction.id}`} replace />;
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
  // The API decides eligibility, and no screen links here unless it says the transaction can be
  // disputed. A stale or typed URL goes back to the transaction, which shows what there is to do:
  // nothing, or a link to the dispute that already exists.
  if (!transaction.eligibility.canDispute) {
    return <Navigate to={back.to} replace />;
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
