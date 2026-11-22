import type { DebitOrder, DebitOrderSort, DebitOrderStatus, MandateType } from '../../api/types';
import type { BadgeTone } from '../../components/Badge';
import { humanizeEnum } from '../../lib/format';

export interface BadgeView {
  label: string;
  tone: BadgeTone;
}

export const STATUS_TONE: Record<DebitOrderStatus, BadgeTone> = {
  Successful: 'success',
  Failed: 'danger',
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

const INELIGIBLE_LABEL: Record<DebitOrder['eligibility']['code'], string> = {
  Eligible: 'Can be disputed',
  WithinMandateTerms: 'Within mandate terms',
  CollectionFailed: 'Nothing to dispute',
  DisputeWindowClosed: 'Dispute window closed',
  AlreadyDisputed: 'Disputed',
};

/** The short badge that tells the customer at a glance whether a debit order can be disputed. */
export function disputabilityBadge(order: DebitOrder): BadgeView {
  if (order.eligibility.canDispute) {
    return { label: 'Can be disputed', tone: 'info' };
  }
  if (order.dispute) {
    return {
      label: `Dispute: ${humanizeEnum(order.dispute.status).toLowerCase()}`,
      tone: 'warning',
    };
  }
  return { label: INELIGIBLE_LABEL[order.eligibility.code], tone: 'neutral' };
}
