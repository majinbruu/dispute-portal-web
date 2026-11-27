import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { TransactionFilters } from '../../api/queryKeys';
import {
  type CardStatus,
  type DebitOrderStatus,
  type DebitOrderType,
  TRANSACTION_SORTS,
  type TransactionSort,
  type TransactionType,
} from '../../api/types';
import { oneOf } from '../../lib/oneOf';

export const TRANSACTION_PAGE_SIZE = 10;
export const DEFAULT_SORT: TransactionSort = '-effectiveDate';
export const DEFAULT_TYPE: TransactionType = 'DebitOrder';
export const DEFAULT_MANDATE_TYPE: DebitOrderType = 'DebiCheck';

export const TRANSACTION_TYPES: readonly TransactionType[] = ['DebitOrder', 'Card'];
export const MANDATE_TYPES: readonly DebitOrderType[] = ['DebiCheck', 'Registered', 'Eft'];
export const DEBIT_ORDER_STATUSES: readonly DebitOrderStatus[] = ['Accepted', 'Rejected'];
export const CARD_STATUSES: readonly CardStatus[] = ['Settled', 'Pending', 'Declined', 'Reversed'];

/**
 * Reads the list filters from the query string, ignoring anything that is not a known value.
 * Debit orders always have a mandate type: DebiCheck, Registered Mandate and EFT debit orders are
 * never listed together, so a missing or unknown type falls back to the default.
 */
export function parseTransactionFilters(params: URLSearchParams): TransactionFilters {
  const page = Number(params.get('page'));
  const paging = {
    sort: oneOf(TRANSACTION_SORTS, params.get('sort')) ?? DEFAULT_SORT,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: TRANSACTION_PAGE_SIZE,
  };
  if (oneOf(TRANSACTION_TYPES, params.get('type')) === 'Card') {
    return { type: 'Card', status: oneOf(CARD_STATUSES, params.get('status')), ...paging };
  }
  return {
    type: 'DebitOrder',
    mandateType: oneOf(MANDATE_TYPES, params.get('mandateType')) ?? DEFAULT_MANDATE_TYPE,
    status: oneOf(DEBIT_ORDER_STATUSES, params.get('status')),
    ...paging,
  };
}

export type FilterName = 'status' | 'mandateType' | 'sort';

export interface TransactionFilterState {
  filters: TransactionFilters;
  /** True when the optional status filter is narrowing the list. */
  hasStatusFilter: boolean;
  setType: (type: TransactionType) => void;
  setFilter: (name: FilterName, value: string) => void;
  setPage: (page: number) => void;
  clearStatusFilter: () => void;
}

/**
 * Keeps the transaction type and its filters in the URL, so a filtered list can be bookmarked,
 * shared and returned to with the back button.
 */
export function useTransactionFilters(): TransactionFilterState {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseTransactionFilters(params), [params]);
  const needsMandateType =
    filters.type === 'DebitOrder' && oneOf(MANDATE_TYPES, params.get('mandateType')) === undefined;

  useEffect(() => {
    // The mandate type of a debit order list is always shown in the URL, so write the default in
    // when it is absent or not a known value. Replace, so the back button does not return to the
    // bare URL.
    if (needsMandateType) {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('mandateType', DEFAULT_MANDATE_TYPE);
          return next;
        },
        { replace: true },
      );
    }
  }, [needsMandateType, setParams]);

  const setType = useCallback(
    (type: TransactionType) => {
      // Each type has its own filters and statuses, so the other type's choices do not carry over.
      setParams(type === DEFAULT_TYPE ? {} : { type });
    },
    [setParams],
  );

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
    setType,
    setFilter,
    setPage,
    clearStatusFilter,
  };
}
