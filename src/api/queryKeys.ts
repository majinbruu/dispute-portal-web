import type { DebitOrderSort, DebitOrderStatus, DisputeState, MandateType } from './types';

export interface DebitOrderFilters {
  status?: DebitOrderStatus;
  /** Required: the two kinds of debit order are never listed together. */
  mandateType: MandateType;
  sort: DebitOrderSort;
  page: number;
  pageSize: number;
}

export interface MandateFilters {
  type: MandateType;
  page: number;
  pageSize: number;
}

export interface DisputeFilters {
  state: DisputeState;
  page: number;
  pageSize: number;
}

export interface NotificationFilters {
  page: number;
  pageSize: number;
}

/** Hierarchical query keys, so a whole resource can be invalidated by its prefix. */
export const queryKeys = {
  debitOrders: {
    all: ['debit-orders'] as const,
    list: (filters: DebitOrderFilters) => ['debit-orders', 'list', filters] as const,
    detail: (id: string) => ['debit-orders', 'detail', id] as const,
  },
  mandates: {
    all: ['mandates'] as const,
    list: (filters: MandateFilters) => ['mandates', 'list', filters] as const,
    detail: (id: string) => ['mandates', 'detail', id] as const,
  },
  disputeReasons: (mandateType: MandateType) => ['dispute-reasons', mandateType] as const,
  disputes: {
    all: ['disputes'] as const,
    lists: ['disputes', 'list'] as const,
    list: (filters: DisputeFilters) => ['disputes', 'list', filters] as const,
    detail: (id: string) => ['disputes', 'detail', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters: NotificationFilters) => ['notifications', 'list', filters] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
};
