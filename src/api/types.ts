import type { components } from './schema';

type Schemas = components['schemas'];

export type Transaction = Schemas['TransactionDto'];
export type TransactionType = Schemas['TransactionType'];
export type DebitOrderDetail = Schemas['DebitOrderDetailDto'];
export type DebitOrderType = Schemas['DebitOrderType'];
export type DebitOrderStatus = Schemas['DebitOrderStatus'];
export type CardDetail = Schemas['CardDetailDto'];
export type CardStatus = Schemas['CardSettlementStatus'];
export type Mandate = Schemas['MandateDto'];
export type MandateType = Schemas['MandateType'];
export type MandateStatus = Schemas['MandateStatus'];
export type DisputeReason = Schemas['DisputeReasonDto'];
export type DisputeSummary = Schemas['DisputeSummaryDto'];
export type DisputeDetail = Schemas['DisputeDetailDto'];
export type DisputeStatus = Schemas['DisputeStatus'];
export type DisputeState = Schemas['DisputeState'];
export type SubmitDisputeRequest = Schemas['SubmitDisputeRequest'];
export type Notification = Schemas['NotificationDto'];

export const TRANSACTION_SORTS = ['-effectiveDate', 'effectiveDate', '-amount', 'amount'] as const;
export type TransactionSort = (typeof TRANSACTION_SORTS)[number];

/** A page of results with its paging numbers normalised to real numbers. */
export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
