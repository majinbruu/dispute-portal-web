import { useParams } from 'react-router';
import {
  useAddAgentComment,
  useAgentDispute,
  useApproveDispute,
  useRejectDispute,
} from '../../api/queries';
import type { AgentDisputeDetail } from '../../api/types';
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
import { describeActionError } from '../disputes/actionErrors';
import { Comments, type CommentView } from '../disputes/Comments';
import { DISPUTE_STATUS_TONE } from '../disputes/presentation';
import styles from './Agent.module.css';
import { ReviewActions } from './ReviewActions';

const TITLE = 'Dispute';
const BACK = { to: '/agent', label: 'Dispute queue' };
const TRAIL_TITLE = 'Audit trail';

/** Who did something: the kind of actor, and their subject ID when it was a person. */
function actorName(actor: string, subjectId: string | null): string {
  return subjectId ? `${actor} ${subjectId}` : actor;
}

function toTimelineItems(dispute: AgentDisputeDetail): TimelineItem[] {
  return [...dispute.events]
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map((event) => ({
      id: `${event.status}-${event.occurredAt}`,
      occurredAt: event.occurredAt,
      title: disputeStatusLabel(event.status),
      description: event.description,
      actor: actorName(event.actor, event.actorSubjectId),
    }));
}

function toCommentViews(dispute: AgentDisputeDetail): CommentView[] {
  return dispute.comments.map((comment) => ({
    id: comment.id,
    author: comment.authorType,
    authorDetail: comment.authorSubjectId,
    body: comment.body,
    createdAt: comment.createdAt,
  }));
}

function Details({ dispute }: { dispute: AgentDisputeDetail }) {
  const { transaction } = dispute;
  const isCard = transaction.type === 'Card';
  const isOpen = dispute.status === 'Submitted' || dispute.status === 'SentToScheme';
  const approve = useApproveDispute(dispute.id);
  const reject = useRejectDispute(dispute.id);
  const addComment = useAddAgentComment(dispute.id);

  return (
    <div className={styles.stack}>
      <Card>
        <div className={styles.summary}>
          <p className={styles.summaryName}>{transaction.counterpartyName}</p>
          <p className={styles.summaryAmount}>
            {formatMoney(transaction.amount, transaction.currency)}
          </p>
        </div>
        <div className={styles.badges}>
          <Badge>{transactionTypeLabel(transaction.type)}</Badge>
          <Badge tone={DISPUTE_STATUS_TONE[dispute.status]}>
            {disputeStatusLabel(dispute.status)}
          </Badge>
        </div>
        {/* Only a dispute that still waits for review can be decided. */}
        {dispute.status === 'Submitted' ? (
          <ReviewActions
            onApprove={() => {
              reject.reset();
              approve.mutate();
            }}
            onReject={(reason) => {
              approve.reset();
              reject.mutate(reason);
            }}
            pending={approve.isPending || reject.isPending}
          />
        ) : null}
        {approve.isSuccess ? (
          <SuccessMessage>Dispute approved. It has been sent for processing.</SuccessMessage>
        ) : null}
        {reject.isSuccess ? (
          <SuccessMessage>
            Dispute rejected. The customer will see your reason as the outcome.
          </SuccessMessage>
        ) : null}
        {/* Shown here, not in the confirmation step: after a 409 that step is no longer on the page. */}
        {approve.isError ? (
          <ErrorState
            problem={describeActionError(approve.error)}
            title="This dispute was not approved"
          />
        ) : null}
        {reject.isError ? (
          <ErrorState
            problem={describeActionError(reject.error)}
            title="This dispute was not rejected"
          />
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
            { label: 'Customer ID', value: dispute.customerId },
            { label: 'Submitted', value: formatDateTime(dispute.submittedAt) },
            {
              label: 'Sent for processing',
              value: dispute.sentToSchemeAt ? formatDateTime(dispute.sentToSchemeAt) : null,
            },
            {
              label: 'Completed',
              value: dispute.completedAt ? formatDateTime(dispute.completedAt) : null,
            },
            { label: 'Outcome', value: dispute.outcomeNote },
          ]}
        />
      </Card>

      <Card title="Transaction">
        <DescriptionList
          items={[
            { label: 'Type', value: transactionTypeLabel(transaction.type) },
            { label: isCard ? 'Merchant' : 'Company', value: transaction.counterpartyName },
            { label: 'Amount', value: formatMoney(transaction.amount, transaction.currency) },
            { label: 'Transaction date', value: formatDate(transaction.transactionDate) },
            // Only a card transaction has a posting date of its own.
            {
              label: 'Posting date',
              value: transaction.postingDate ? formatDate(transaction.postingDate) : null,
            },
            { label: 'Account', value: transaction.accountMasked },
            // How the payment scheme identifies the transaction, named as that scheme names it.
            {
              label: isCard ? 'Acquirer reference number' : 'Transaction ID',
              value: transaction.schemeReference,
            },
            { label: 'Card scheme', value: transaction.cardScheme },
            {
              label: 'Mandate type',
              value: transaction.mandateType ? mandateTypeLabel(transaction.mandateType) : null,
            },
            { label: 'Mandate reference', value: transaction.mandateReference },
          ]}
        />
      </Card>

      <Card title={TRAIL_TITLE}>
        <Timeline items={toTimelineItems(dispute)} label={TRAIL_TITLE} />
      </Card>

      <Comments
        comments={toCommentViews(dispute)}
        canComment={isOpen}
        onAdd={addComment.mutateAsync}
      />
    </div>
  );
}

/** One dispute as an agent reviews it: the transaction, who did what, the comments, the decision. */
export function AgentDisputePage() {
  const { id = '' } = useParams();
  const query = useAgentDispute(id);

  if (query.isPending) {
    return (
      <>
        <PageHeader title={TITLE} back={BACK} />
        <Spinner label="Loading dispute…" />
      </>
    );
  }
  // Keep showing the dispute if re-reading it after a conflict fails.
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
      <PageHeader title={query.data.reference} description={TITLE} back={BACK} />
      <Details dispute={query.data} />
    </>
  );
}
