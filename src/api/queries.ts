import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toNumber } from '../lib/format';
import { useApiClient } from './apiContext';
import { unwrap } from './client';
import { normalizePaged } from './paging';
import {
  type DebitOrderFilters,
  type DisputeFilters,
  type MandateFilters,
  type NotificationFilters,
  queryKeys,
} from './queryKeys';
import type { MandateType, SubmitDisputeRequest } from './types';

/** How often a pending dispute is re-read while the scheme is still deciding its outcome. */
export const PENDING_DISPUTE_POLL_MS = 3_000;
const UNREAD_COUNT_POLL_MS = 30_000;
const REFERENCE_DATA_STALE_MS = 5 * 60_000;

export function useDebitOrders(filters: DebitOrderFilters) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.debitOrders.list(filters),
    queryFn: async ({ signal }) =>
      normalizePaged(
        await unwrap(
          api.GET('/api/v1/debit-orders', {
            params: {
              query: {
                Status: filters.status,
                MandateType: filters.mandateType,
                Sort: filters.sort,
                Page: filters.page,
                PageSize: filters.pageSize,
              },
            },
            signal,
          }),
        ),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useDebitOrder(id: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.debitOrders.detail(id),
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/debit-orders/{id}', { params: { path: { id } }, signal })),
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
              query: { Type: filters.type, Page: filters.page, PageSize: filters.pageSize },
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

export function useDisputeReasons(mandateType: MandateType | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.disputeReasons(mandateType ?? 'Registered'),
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/dispute-reasons', { params: { query: { mandateType } }, signal })),
    enabled: mandateType !== undefined,
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.debitOrders.all });
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
              query: { State: filters.state, Page: filters.page, PageSize: filters.pageSize },
            },
            signal,
          }),
        ),
      ),
    placeholderData: keepPreviousData,
  });
}

/**
 * One dispute with its timeline. While it is pending it is polled, because a background job
 * moves it to its outcome within about half a minute; polling stops once it is completed.
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

export function useNotifications(filters: NotificationFilters) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: async ({ signal }) =>
      normalizePaged(
        await unwrap(
          api.GET('/api/v1/notifications', {
            params: { query: { Page: filters.page, PageSize: filters.pageSize } },
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
