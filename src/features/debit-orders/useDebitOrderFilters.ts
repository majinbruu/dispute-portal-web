import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { DebitOrderFilters } from '../../api/queryKeys';
import {
  DEBIT_ORDER_SORTS,
  type DebitOrderSort,
  type DebitOrderStatus,
  type MandateType,
} from '../../api/types';

export const DEBIT_ORDER_PAGE_SIZE = 10;
export const DEFAULT_SORT: DebitOrderSort = '-actionDate';

const STATUSES: readonly DebitOrderStatus[] = ['Successful', 'Failed'];
const MANDATE_TYPES: readonly MandateType[] = ['DebiCheck', 'Registered'];

function oneOf<T extends string>(allowed: readonly T[], value: string | null): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

/** Reads the list filters from the query string, ignoring anything that is not a known value. */
export function parseDebitOrderFilters(params: URLSearchParams): DebitOrderFilters {
  const page = Number(params.get('page'));
  return {
    status: oneOf(STATUSES, params.get('status')),
    mandateType: oneOf(MANDATE_TYPES, params.get('mandateType')),
    sort: oneOf(DEBIT_ORDER_SORTS, params.get('sort')) ?? DEFAULT_SORT,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: DEBIT_ORDER_PAGE_SIZE,
  };
}

export type FilterName = 'status' | 'mandateType' | 'sort';

export interface DebitOrderFilterState {
  filters: DebitOrderFilters;
  hasActiveFilters: boolean;
  setFilter: (name: FilterName, value: string) => void;
  setPage: (page: number) => void;
  clearFilters: () => void;
}

/**
 * Keeps the debit order filters in the URL, so a filtered list can be bookmarked, shared and
 * returned to with the back button.
 */
export function useDebitOrderFilters(): DebitOrderFilterState {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseDebitOrderFilters(params), [params]);

  const setFilter = useCallback(
    (name: FilterName, value: string) => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        if (value === '' || (name === 'sort' && value === DEFAULT_SORT)) {
          next.delete(name);
        } else {
          next.set(name, value);
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
    setParams(new URLSearchParams());
  }, [setParams]);

  return {
    filters,
    hasActiveFilters: filters.status !== undefined || filters.mandateType !== undefined,
    setFilter,
    setPage,
    clearFilters,
  };
}
