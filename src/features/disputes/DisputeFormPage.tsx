import { useParams } from 'react-router';
import { useDebitOrder, useDisputeReasons } from '../../api/queries';
import type { DebitOrder } from '../../api/types';
import { ButtonLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { formatDate, formatMoney } from '../../lib/format';
import { toProblem } from '../../lib/problem';
import { DisputeForm } from './DisputeForm';
import styles from './Disputes.module.css';

const TITLE = 'Dispute a debit order';

function OrderSummary({ order }: { order: DebitOrder }) {
  return (
    <Card>
      <div className={styles.summary}>
        <div>
          <p className={styles.summaryName}>{order.creditorName}</p>
          <p className={styles.note}>
            {order.statementText} · {formatDate(order.actionDate)}
          </p>
        </div>
        <p className={styles.summaryAmount}>{formatMoney(order.amount, order.currency)}</p>
      </div>
    </Card>
  );
}

function Reasons({ order }: { order: DebitOrder }) {
  const query = useDisputeReasons(order.mandateType);

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
        title="This debit order cannot be disputed online"
        description="No dispute reasons are available for this type of mandate."
      />
    );
  }
  return <DisputeForm order={order} reasons={query.data} />;
}

export function DisputeFormPage() {
  const { id = '' } = useParams();
  const back = { to: `/debit-orders/${id}`, label: 'Debit order' };
  const query = useDebitOrder(id);

  if (query.isPending) {
    return (
      <>
        <PageHeader title={TITLE} back={back} />
        <Spinner label="Loading debit order…" />
      </>
    );
  }
  if (query.isError) {
    return (
      <>
        <PageHeader title={TITLE} back={back} />
        <ErrorState
          problem={toProblem(query.error)}
          title="We could not load this debit order"
          onRetry={() => void query.refetch()}
        />
      </>
    );
  }

  const order = query.data;
  // The API decides eligibility; the form is only offered when it says the order can be disputed.
  if (!order.eligibility.canDispute) {
    return (
      <>
        <PageHeader title={TITLE} back={back} />
        <div className={styles.stack}>
          <OrderSummary order={order} />
          <EmptyState
            title="This debit order cannot be disputed"
            description={order.eligibility.message}
            action={
              order.dispute ? (
                <ButtonLink to={`/disputes/${order.dispute.id}`}>View dispute progress</ButtonLink>
              ) : (
                <ButtonLink to={back.to} variant="secondary">
                  Back to debit order
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
        <OrderSummary order={order} />
        <Reasons order={order} />
      </div>
    </>
  );
}
