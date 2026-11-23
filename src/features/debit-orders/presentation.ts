import type { DebitOrderSort, DebitOrderStatus } from '../../api/types';
import type { BadgeTone } from '../../components/Badge';

export const STATUS_TONE: Record<DebitOrderStatus, BadgeTone> = {
  Accepted: 'success',
  Rejected: 'danger',
};

export const SORT_LABEL: Record<DebitOrderSort, string> = {
  '-actionDate': 'Newest first',
  actionDate: 'Oldest first',
  '-amount': 'Highest amount',
  amount: 'Lowest amount',
};
