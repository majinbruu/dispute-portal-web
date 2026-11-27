import { Link, useParams } from 'react-router';
import { useAddDisputeComment, useDispute, useWithdrawDispute } from '../../api/queries';
import type { DisputeDetail } from '../../api/types';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { DescriptionList } from '../../components/DescriptionList';
import { ErrorState } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { SuccessMessage } from '../../components/SuccessMessage';
import { Timeline, type TimelineItem } from '../../components/Timeline';
import { formatDate, formatDateTime, formatMoney } from '../../lib/format';
import {
  disputeReasonLabel,
  disputeStatusLabel,
  mandateTypeLabel,
  transactionTypeLabel,
} from '../../lib/labels';
import { toProblem } from '../../lib/problem';
import { describeActionError } from './actionErrors';
import { Comments, type CommentView } from './Comments';
import styles from './Disputes.module.css';
import { DISPUTE_STATUS_DESCRIPTION, DISPUTE_STATUS_TONE, disputeEventKey } from './presentation';
import { useDisputeStatusSync } from './useDisputeStatusSync';
import { WithdrawDispute } from './WithdrawDispute';

const TITLE = 'Dispute progress';
const BACK = { to: '/disputes', label: 'Dispute history' };

function toTimelineItems(dispute: DisputeDetail): TimelineItem[] {
  return [...dispute.events]
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map((event, position) => ({
      id: disputeEventKey(event, position),
      occurredAt: event.occurredAt,
      title: disputeStatusLabel(event.status),
      description: event.description,
    }));
}

/** The customer is not told which agent wrote a comment: an agent speaks for the bank. */
function toCommentViews(dispute: DisputeDetail): CommentView[] {
  return dispute.comments.map((comment) => ({
    id: comment.id,
    author: comment.authorType === 'Customer' ? 'You' : 'ACME Bank',
    body: comment.body,
    createdAt: comment.createdAt,
  }));
}

function Details({ dispute }: { dispute: DisputeDetail }) {
  const isPending = dispute.state === 'Pending';
  const isCard = dispute.transactionType === 'Card';
  const withdraw = useWithdrawDispute(dispute.id);
  const addComment = useAddDisputeComment(dispute.id);
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
        <p>{DISPUTE_STATUS_DESCRIPTION[dispute.status]}</p>
        {/* Only a dispute that still waits for review can be withdrawn. */}
        {dispute.status === 'Submitted' ? (
          <WithdrawDispute
            onConfirm={() => {
              withdraw.mutate();
            }}
            pending={withdraw.isPending}
          />
        ) : null}
        {withdraw.isSuccess ? <SuccessMessage>Your dispute was withdrawn.</SuccessMessage> : null}
        {/* Shown here, not in the confirmation step: after a 409 that step is no longer on the page. */}
        {withdraw.isError ? (
          <ErrorState
            problem={describeActionError(withdraw.error)}
            title="Your dispute was not withdrawn"
          />
        ) : null}
      </Card>

      <Card title={TITLE}>
        <Timeline items={toTimelineItems(dispute)} label={TITLE} />
        {isPending ? (
          <div className={styles.polling}>
            <Spinner inline label="Checking for updates…" />
          </div>
        ) : null}
      </Card>

      {/* A pending dispute is an open one: waiting for review or being processed. */}
      <Comments
        comments={toCommentViews(dispute)}
        canComment={isPending}
        onAdd={addComment.mutateAsync}
      />

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
  // Re-read every few seconds while the dispute is pending; see useDispute.
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
