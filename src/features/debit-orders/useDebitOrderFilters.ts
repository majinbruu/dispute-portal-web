import { useCallback, useEffect, useMemo } from 'react';
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
export const DEFAULT_MANDATE_TYPE: MandateType = 'DebiCheck';

const STATUSES: readonly DebitOrderStatus[] = ['Accepted', 'Rejected'];
export const MANDATE_TYPES: readonly MandateType[] = ['DebiCheck', 'Registered'];

function oneOf<T extends string>(allowed: readonly T[], value: string | null): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

/**
 * Reads the list filters from the query string, ignoring anything that is not a known value.
 * A mandate type is always present: DebiCheck and Registered Mandate debit orders are never
 * listed together, so a missing or unknown type falls back to the default.
 */
export function parseDebitOrderFilters(params: URLSearchParams): DebitOrderFilters {
  const page = Number(params.get('page'));
  return {
    status: oneOf(STATUSES, params.get('status')),
    mandateType: oneOf(MANDATE_TYPES, params.get('mandateType')) ?? DEFAULT_MANDATE_TYPE,
    sort: oneOf(DEBIT_ORDER_SORTS, params.get('sort')) ?? DEFAULT_SORT,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: DEBIT_ORDER_PAGE_SIZE,
  };
}

export type FilterName = 'status' | 'mandateType' | 'sort';

export interface DebitOrderFilterState {
  filters: DebitOrderFilters;
  /** True when the optional status filter is narrowing the list. */
  hasStatusFilter: boolean;
  setFilter: (name: FilterName, value: string) => void;
  setPage: (page: number) => void;
  clearStatusFilter: () => void;
}

/**
 * Keeps the debit order filters in the URL, so a filtered list can be bookmarked, shared and
 * returned to with the back button.
 */
export function useDebitOrderFilters(): DebitOrderFilterState {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseDebitOrderFilters(params), [params]);
  const mandateTypeInUrl = oneOf(MANDATE_TYPES, params.get('mandateType')) !== undefined;

  useEffect(() => {
    // The mandate type is always shown in the URL, so write the default in when it is absent
    // or not a known value. Replace, so the back button does not return to the bare URL.
    if (!mandateTypeInUrl) {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('mandateType', DEFAULT_MANDATE_TYPE);
          return next;
        },
        { replace: true },
      );
    }
  }, [mandateTypeInUrl, setParams]);

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

  const clearStatusFilter = useCallback(() => {
    setFilter('status', '');
  }, [setFilter]);

  return {
    filters,
    hasStatusFilter: filters.status !== undefined,
    setFilter,
    setPage,
    clearStatusFilter,
  };
}
