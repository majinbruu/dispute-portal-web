import type { DisputeStatus } from '../../api/types';
import type { BadgeTone } from '../../components/Badge';

/** What each status means for the customer, shown under the status on the dispute's page. */
export const DISPUTE_STATUS_DESCRIPTION: Record<DisputeStatus, string> = {
  Submitted:
    'Your dispute is waiting for review by ACME Bank. You can withdraw it until it has been reviewed.',
  SentToScheme:
    'Your dispute was approved and is being processed. We will let you know the outcome in your inbox.',
  Refunded: 'Your dispute was successful and the amount was paid back into your account.',
  Declined: 'Your dispute was declined. The outcome is shown under the dispute details.',
  Withdrawn: 'You withdrew this dispute before it was reviewed, so nothing was processed.',
};

export const DISPUTE_STATUS_TONE: Record<DisputeStatus, BadgeTone> = {
  Submitted: 'info',
  SentToScheme: 'warning',
  Refunded: 'success',
  Declined: 'danger',
  Withdrawn: 'neutral',
};
