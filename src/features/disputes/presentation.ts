import type { DisputeStatus } from '../../api/types';
import type { BadgeTone } from '../../components/Badge';

export const DISPUTE_STATUS_LABEL: Record<DisputeStatus, string> = {
  Submitted: 'Submitted',
  SentToScheme: 'Sent to scheme',
  Refunded: 'Refunded',
  Declined: 'Declined',
};

export const DISPUTE_STATUS_TONE: Record<DisputeStatus, BadgeTone> = {
  Submitted: 'info',
  SentToScheme: 'warning',
  Refunded: 'success',
  Declined: 'danger',
};
