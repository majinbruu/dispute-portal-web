import { Link, useParams } from 'react-router';
import { useDispute } from '../../api/queries';
import type { DisputeDetail } from '../../api/types';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { DescriptionList } from '../../components/DescriptionList';
import { ErrorState } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { Timeline, type TimelineItem } from '../../components/Timeline';
import { formatDate, formatDateTime, formatMoney } from '../../lib/format';
import {
  disputeReasonLabel,
  disputeStatusLabel,
  mandateTypeLabel,
  transactionTypeLabel,
} from '../../lib/labels';
import { toProblem } from '../../lib/problem';
import styles from './Disputes.module.css';
import { DISPUTE_STATUS_TONE } from './presentation';
import { useDisputeStatusSync } from './useDisputeStatusSync';

const TITLE = 'Dispute progress';
const BACK = { to: '/disputes', label: 'Dispute history' };

function toTimelineItems(dispute: DisputeDetail): TimelineItem[] {
  return [...dispute.events]
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map((event) => ({
      id: `${event.status}-${event.occurredAt}`,
      occurredAt: event.occurredAt,
      title: disputeStatusLabel(event.status),
      description: event.description,
    }));
}

function Details({ dispute }: { dispute: DisputeDetail }) {
  const isPending = dispute.state === 'Pending';
  const isCard = dispute.transactionType === 'Card';
  return (
    <div className={styles.stack}>
      <Card>
        <div className={styles.summary}>
          <div>
            <p className={styles.summaryName}>{dispute.counterpartyName}</p>
            <p className={styles.note}>Reference {dispute.reference}</p>
          </div>
          <p className={styles.summaryAmount}>{formatMoney(dispute.amount, dispute.currency)}</p>
        </div>
        <div className={styles.badges}>
          <Badge tone={DISPUTE_STATUS_TONE[dispute.status]}>
            {disputeStatusLabel(dispute.status)}
          </Badge>
          <Badge>{isPending ? 'Pending' : 'Completed'}</Badge>
        </div>
      </Card>

      <Card title={TITLE}>
        <Timeline items={toTimelineItems(dispute)} label={TITLE} />
        {isPending ? (
          <div className={styles.polling}>
            <Spinner inline label="Checking for updates…" />
          </div>
        ) : null}
      </Card>

      <Card title="Dispute details">
        <DescriptionList
          items={[
            { label: 'Reference', value: dispute.reference },
            {
              label: 'Reason',
              value: disputeReasonLabel(dispute.reasonLabel, dispute.reasonCode),
            },
            { label: 'Amount', value: formatMoney(dispute.amount, dispute.currency) },
            {
              label: transactionTypeLabel(dispute.transactionType),
              value: (
                <Link to={`/transactions/${dispute.transactionId}`}>
                  {dispute.counterpartyName}, {formatDate(dispute.transactionDate)}
                </Link>
              ),
            },
            // How the payment scheme identifies the transaction, named as that scheme names it.
            {
              label: isCard ? 'Acquirer reference number' : 'Transaction ID',
              value: dispute.schemeReference,
            },
            // A card dispute has a card scheme and no mandate; an EFT debit order has a mandate
            // type and no mandate reference. Rows without a value are left out.
            { label: 'Card scheme', value: dispute.cardScheme },
            {
              label: 'Mandate type',
              value: dispute.mandateType ? mandateTypeLabel(dispute.mandateType) : null,
            },
            { label: 'Mandate reference', value: dispute.mandateReference },
            { label: 'Submitted', value: formatDateTime(dispute.submittedAt) },
            {
              label: 'Completed',
              value: dispute.completedAt ? formatDateTime(dispute.completedAt) : null,
            },
            { label: 'Outcome', value: dispute.outcomeNote },
          ]}
        />
      </Card>
    </div>
  );
}

export function DisputeDetailPage() {
  const { id = '' } = useParams();
  // Polls every 3 seconds while the dispute is pending; see useDispute.
  const query = useDispute(id);
  useDisputeStatusSync(query.data?.status);

  if (query.isPending) {
    return (
      <>
        <PageHeader title={TITLE} back={BACK} />
        <Spinner label="Loading dispute…" />
      </>
    );
  }
  // Keep showing the last known progress if a background poll fails.
  if (query.isError && !query.data) {
    return (
      <>
        <PageHeader title={TITLE} back={BACK} />
        <ErrorState
          problem={toProblem(query.error)}
          title="We could not load this dispute"
          onRetry={() => void query.refetch()}
        />
      </>
    );
  }
  return (
    <>
      <PageHeader title={TITLE} back={BACK} />
      <Details dispute={query.data} />
    </>
  );
}
