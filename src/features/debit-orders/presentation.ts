import type { DebitOrderSort, DebitOrderStatus, MandateType } from '../../api/types';
import type { BadgeTone } from '../../components/Badge';

export const STATUS_TONE: Record<DebitOrderStatus, BadgeTone> = {
  Accepted: 'success',
  Rejected: 'danger',
};

export const MANDATE_TYPE_LABEL: Record<MandateType, string> = {
  DebiCheck: 'DebiCheck',
  Registered: 'Registered',
};

export const SORT_LABEL: Record<DebitOrderSort, string> = {
  '-actionDate': 'Newest first',
  actionDate: 'Oldest first',
  '-amount': 'Highest amount',
  amount: 'Lowest amount',
};
