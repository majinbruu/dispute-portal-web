import type { DisputeStatus } from '../../api/types';
import type { BadgeTone } from '../../components/Badge';

export const DISPUTE_STATUS_TONE: Record<DisputeStatus, BadgeTone> = {
  Submitted: 'info',
  SentToScheme: 'warning',
  Refunded: 'success',
  Declined: 'danger',
};
