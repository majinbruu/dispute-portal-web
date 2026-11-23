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
import { MANDATE_TYPE_LABEL, STATUS_TONE } from './presentation';

const BACK = { to: '/debit-orders', label: 'My debit orders' };

function Details({ order }: { order: DebitOrder }) {
  const { dispute } = order;
  return (
    <div className={styles.stack}>
      <Card>
        <div className={styles.summary}>
          <p className={styles.amount}>{formatMoney(order.amount, order.currency)}</p>
          <div className={styles.badges}>
            <Badge>{MANDATE_TYPE_LABEL[order.mandateType]}</Badge>
            <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
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
        {/* The API decides eligibility; the action is simply absent when it says no. */}
        {order.eligibility.canDispute ? (
          <div className={styles.actions}>
            <ButtonLink to={`/debit-orders/${order.id}/dispute`}>Dispute</ButtonLink>
          </div>
        ) : null}
      </Card>
      {dispute ? (
        <Card title="Dispute">
          <DescriptionList
            items={[
              { label: 'Reference', value: dispute.reference },
              { label: 'Status', value: humanizeEnum(dispute.status) },
            ]}
          />
          <div className={styles.actions}>
            <ButtonLink to={`/disputes/${dispute.id}`} variant="secondary">
              View dispute progress
            </ButtonLink>
          </div>
        </Card>
      ) : null}
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
