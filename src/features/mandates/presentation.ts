import type { MandateStatus, MandateType } from '../../api/types';
import type { BadgeTone } from '../../components/Badge';

export interface MandateTypeView {
  type: MandateType;
  /** URL segment under `/mandates`. */
  slug: string;
  title: string;
  description: string;
  emptyMessage: string;
}

export const MANDATE_TYPE_VIEWS: Record<MandateType, MandateTypeView> = {
  DebiCheck: {
    type: 'DebiCheck',
    slug: 'debicheck',
    title: 'DebiCheck mandates',
    description: 'Debit orders you approved electronically with your bank.',
    emptyMessage: 'You have no DebiCheck mandates available to display',
  },
  Registered: {
    type: 'Registered',
    slug: 'registered',
    title: 'Registered mandates',
    description: 'Debit orders set up with a company by signed or recorded agreement.',
    emptyMessage: 'No mandates to display',
  },
};

export const MANDATE_STATUS_TONE: Record<MandateStatus, BadgeTone> = {
  Active: 'success',
  Suspended: 'warning',
  Cancelled: 'neutral',
  Expired: 'neutral',
};

export function mandateListPath(type: MandateType): string {
  return `/mandates/${MANDATE_TYPE_VIEWS[type].slug}`;
}
