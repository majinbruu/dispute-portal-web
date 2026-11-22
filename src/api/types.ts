import type { components } from './schema';

type Schemas = components['schemas'];

export type DebitOrder = Schemas['DebitOrderDto'];
export type DebitOrderStatus = Schemas['DebitOrderStatus'];
export type DisputeEligibility = Schemas['DisputeEligibilityDto'];
export type Mandate = Schemas['MandateDto'];
export type MandateType = Schemas['MandateType'];
export type MandateStatus = Schemas['MandateStatus'];
export type DisputeReason = Schemas['DisputeReasonDto'];
export type DisputeSummary = Schemas['DisputeSummaryDto'];
export type DisputeDetail = Schemas['DisputeDetailDto'];
export type DisputeEvent = Schemas['DisputeEventDto'];
export type DisputeStatus = Schemas['DisputeStatus'];
export type DisputeState = Schemas['DisputeState'];
export type SubmitDisputeRequest = Schemas['SubmitDisputeRequest'];
export type Notification = Schemas['NotificationDto'];

export const DEBIT_ORDER_SORTS = ['-actionDate', 'actionDate', '-amount', 'amount'] as const;
export type DebitOrderSort = (typeof DEBIT_ORDER_SORTS)[number];

/** A page of results with its paging numbers normalised to real numbers. */
export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
