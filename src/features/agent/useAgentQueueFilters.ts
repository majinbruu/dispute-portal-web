import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { AgentDisputeFilters } from '../../api/queryKeys';
import type { DisputeStatus } from '../../api/types';
import { oneOf } from '../../lib/oneOf';

export const AGENT_QUEUE_PAGE_SIZE = 10;
/** The API accepts at most this many characters of a dispute reference. */
export const REFERENCE_MAX_LENGTH = 30;

export const DISPUTE_STATUSES: readonly DisputeStatus[] = [
  'Submitted',
  'SentToScheme',
  'Refunded',
  'Declined',
  'Withdrawn',
];
export const DISPUTED_TRANSACTION_TYPES: readonly NonNullable<
  AgentDisputeFilters['transactionType']
>[] = ['DebitOrder', 'Card'];

/** Reads the queue filters from the query string, ignoring anything that is not a known value. */
export function parseAgentQueueFilters(params: URLSearchParams): AgentDisputeFilters {
  const page = Number(params.get('page'));
  const reference = (params.get('reference') ?? '').trim().slice(0, REFERENCE_MAX_LENGTH);
  return {
    status: oneOf(DISPUTE_STATUSES, params.get('status')),
    transactionType: oneOf(DISPUTED_TRANSACTION_TYPES, params.get('type')),
    reference: reference === '' ? undefined : reference,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: AGENT_QUEUE_PAGE_SIZE,
  };
}

export type AgentQueueFilterName = 'status' | 'type' | 'reference';

export interface AgentQueueFilterState {
  filters: AgentDisputeFilters;
  /** True when any filter is narrowing the queue. */
  hasFilters: boolean;
  setFilter: (name: AgentQueueFilterName, value: string) => void;
  setPage: (page: number) => void;
  clearFilters: () => void;
}

/**
 * Keeps the queue's filters in the URL, so a filtered queue can be bookmarked and returned to
 * with the back button after opening a dispute.
 */
export function useAgentQueueFilters(): AgentQueueFilterState {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseAgentQueueFilters(params), [params]);

  const setFilter = useCallback(
    (name: AgentQueueFilterName, value: string) => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        if (value.trim() === '') {
          next.delete(name);
        } else {
          next.set(name, value.trim());
        }
        next.delete('page');
        return next;
      });
    },
    [setParams],
  );

  const setPage = useCallback(
    (page: number) => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        if (page <= 1) {
          next.delete('page');
        } else {
          next.set('page', String(page));
        }
        return next;
      });
    },
    [setParams],
  );

  const clearFilters = useCallback(() => {
    setParams({});
  }, [setParams]);

  return {
    filters,
    hasFilters:
      filters.status !== undefined ||
      filters.transactionType !== undefined ||
      filters.reference !== undefined,
    setFilter,
    setPage,
    clearFilters,
  };
}
