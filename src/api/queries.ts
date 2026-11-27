import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toNumber } from '../lib/format';
import { isConflict } from '../lib/problem';
import { useApiClient } from './apiContext';
import { unwrap } from './client';
import { normalizePaged } from './paging';
import {
  type DisputeFilters,
  type MandateFilters,
  type NotificationFilters,
  queryKeys,
  type TransactionFilters,
} from './queryKeys';
import type { SubmitDisputeRequest } from './types';

/** How often a pending dispute is re-read while it waits for review or for its outcome. */
export const PENDING_DISPUTE_POLL_MS = 3_000;
const UNREAD_COUNT_POLL_MS = 30_000;
const REFERENCE_DATA_STALE_MS = 5 * 60_000;

/** The type's own filters, under the parameter names the API uses for that type. */
function transactionQuery(filters: TransactionFilters) {
  const paging = { sort: filters.sort, page: filters.page, pageSize: filters.pageSize };
  return filters.type === 'DebitOrder'
    ? {
        type: filters.type,
        mandateType: filters.mandateType,
        debitOrderStatus: filters.status,
        ...paging,
      }
    : { type: filters.type, cardStatus: filters.status, ...paging };
}

export function useTransactions(filters: TransactionFilters) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: async ({ signal }) =>
      normalizePaged(
        await unwrap(
          api.GET('/api/v1/transactions', {
            params: { query: transactionQuery(filters) },
            signal,
          }),
        ),
      ),
    placeholderData: keepPreviousData,
  });
}

/** One transaction of either type: a debit order or a card transaction. */
export function useTransaction(id: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.transactions.detail(id),
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/transactions/{id}', { params: { path: { id } }, signal })),
  });
}

export function useMandates(filters: MandateFilters) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.mandates.list(filters),
    queryFn: async ({ signal }) =>
      normalizePaged(
        await unwrap(
          api.GET('/api/v1/mandates', {
            params: {
              query: { type: filters.type, page: filters.page, pageSize: filters.pageSize },
            },
            signal,
          }),
        ),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useMandate(id: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.mandates.detail(id),
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/mandates/{id}', { params: { path: { id } }, signal })),
  });
}

/** Reasons the customer may choose for this transaction; the API decides which ones apply. */
export function useDisputeReasons(transactionId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.disputeReasons(transactionId),
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/dispute-reasons', { params: { query: { transactionId } }, signal })),
    staleTime: REFERENCE_DATA_STALE_MS,
  });
}

export interface SubmitDisputeVariables {
  request: SubmitDisputeRequest;
  /** Makes the submission safe to retry: the API returns the same dispute for the same key. */
  idempotencyKey: string;
}

export function useSubmitDispute() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ request, idempotencyKey }: SubmitDisputeVariables) =>
      unwrap(
        api.POST('/api/v1/disputes', {
          body: request,
          params: { header: { 'Idempotency-Key': idempotencyKey } },
        }),
      ),
    onSuccess: (dispute) => {
      queryClient.setQueryData(queryKeys.disputes.detail(dispute.id), dispute);
      void queryClient.invalidateQueries({ queryKey: queryKeys.disputes.lists });
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useDisputes(filters: DisputeFilters) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.disputes.list(filters),
    queryFn: async ({ signal }) =>
      normalizePaged(
        await unwrap(
          api.GET('/api/v1/disputes', {
            params: {
              query: { state: filters.state, page: filters.page, pageSize: filters.pageSize },
            },
            signal,
          }),
        ),
      ),
    placeholderData: keepPreviousData,
  });
}

/**
 * One dispute with its timeline. While it is pending it is polled, because an agent's decision
 * and then the scheme's outcome arrive without the customer doing anything; polling stops once it
 * is completed.
 */
export function useDispute(id: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.disputes.detail(id),
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/disputes/{id}', { params: { path: { id } }, signal })),
    refetchInterval: (query) =>
      query.state.data?.state === 'Pending' ? PENDING_DISPUTE_POLL_MS : false,
  });
}

/**
 * Withdraws the customer's own dispute. A 409 means an agent reviewed it first, so the dispute
 * is re-read and the screen shows what happened instead.
 */
export function useWithdrawDispute(id: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap(api.POST('/api/v1/disputes/{id}/withdraw', { params: { path: { id } } })),
    onSuccess: (dispute) => {
      queryClient.setQueryData(queryKeys.disputes.detail(id), dispute);
    },
    onError: (error) => {
      if (isConflict(error)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.disputes.detail(id) });
      }
    },
  });
}

export function useNotifications(filters: NotificationFilters) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: async ({ signal }) =>
      normalizePaged(
        await unwrap(
          api.GET('/api/v1/notifications', {
            params: { query: { page: filters.page, pageSize: filters.pageSize } },
            signal,
          }),
        ),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useUnreadCount() {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: async ({ signal }) => {
      const { unread } = await unwrap(api.GET('/api/v1/notifications/unread-count', { signal }));
      const count = toNumber(unread);
      return Number.isFinite(count) ? count : 0;
    },
    refetchInterval: UNREAD_COUNT_POLL_MS,
  });
}

export function useMarkNotificationRead() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(api.POST('/api/v1/notifications/{id}/read', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}
