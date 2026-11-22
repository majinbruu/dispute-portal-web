import { Link, useParams } from 'react-router';
import { useDebitOrder } from '../../api/queries';
import type { DebitOrder } from '../../api/types';
import { Badge } from '../../components/Badge';
import { ButtonLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { DescriptionList } from '../../components/DescriptionList';
import { ErrorState } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { formatDate, formatMoney, humanizeEnum } from '../../lib/format';
import { toProblem } from '../../lib/problem';
import styles from './DebitOrders.module.css';
import { disputabilityBadge, MANDATE_TYPE_LABEL, STATUS_TONE } from './presentation';

const BACK = { to: '/debit-orders', label: 'My debit orders' };

function DisputeCard({ order }: { order: DebitOrder }) {
  const { eligibility, dispute } = order;

  if (dispute) {
    return (
      <Card title="Dispute">
        <p>
          You disputed this debit order. Reference <strong>{dispute.reference}</strong>, status{' '}
          <strong>{humanizeEnum(dispute.status).toLowerCase()}</strong>.
        </p>
        <div className={styles.actions}>
          <ButtonLink to={`/disputes/${dispute.id}`} variant="secondary">
            View dispute progress
          </ButtonLink>
        </div>
      </Card>
    );
  }

  if (eligibility.canDispute) {
    return (
      <Card title="Dispute">
        <p>{eligibility.message}</p>
        <p className={styles.note}>
          Last day to dispute: <strong>{formatDate(eligibility.lastDisputeDate)}</strong>
        </p>
        <div className={styles.actions}>
          <ButtonLink to={`/debit-orders/${order.id}/dispute`}>Dispute this debit order</ButtonLink>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Dispute">
      <p>This debit order cannot be disputed.</p>
      <p className={styles.note}>{eligibility.message}</p>
    </Card>
  );
}

function Details({ order }: { order: DebitOrder }) {
  const disputability = disputabilityBadge(order);
  return (
    <div className={styles.stack}>
      <Card>
        <div className={styles.summary}>
          <p className={styles.amount}>{formatMoney(order.amount, order.currency)}</p>
          <div className={styles.badges}>
            <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
            <Badge>{MANDATE_TYPE_LABEL[order.mandateType]}</Badge>
            <Badge tone={disputability.tone}>{disputability.label}</Badge>
          </div>
        </div>
        <DescriptionList
          items={[
            { label: 'Statement text', value: order.statementText },
            { label: 'Date', value: formatDate(order.actionDate) },
            { label: 'Status', value: order.status },
            { label: 'Reason', value: order.statusReason },
            { label: 'Transaction ID', value: order.transactionId },
            { label: 'Account', value: order.debtorAccountMasked },
            { label: 'Collection', value: humanizeEnum(order.sequenceType) },
          ]}
        />
      </Card>
      <Card title="Mandate">
        <DescriptionList
          items={[
            { label: 'Mandate type', value: MANDATE_TYPE_LABEL[order.mandateType] },
            {
              label: 'Mandate reference',
              value: <Link to={`/mandates/${order.mandateId}`}>{order.mandateReference}</Link>,
            },
          ]}
        />
      </Card>
      <DisputeCard order={order} />
    </div>
  );
}

export function DebitOrderDetailPage() {
  const { id = '' } = useParams();
  const query = useDebitOrder(id);

  if (query.isPending) {
    return (
      <>
        <PageHeader title="Debit order" back={BACK} />
        <Spinner label="Loading debit order…" />
      </>
    );
  }
  if (query.isError) {
    return (
      <>
        <PageHeader title="Debit order" back={BACK} />
        <ErrorState
          problem={toProblem(query.error)}
          title="We could not load this debit order"
          onRetry={() => void query.refetch()}
        />
      </>
    );
  }
  return (
    <>
      <PageHeader title={query.data.creditorName} description="Debit order" back={BACK} />
      <Details order={query.data} />
    </>
  );
}
