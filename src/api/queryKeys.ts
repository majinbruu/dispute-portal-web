import type {
  AgentDisputeSummary,
  CardStatus,
  DebitOrderStatus,
  DebitOrderType,
  DisputeState,
  DisputeStatus,
  MandateType,
  TransactionSort,
} from './types';

interface TransactionPaging {
  sort: TransactionSort;
  page: number;
  pageSize: number;
}

export interface DebitOrderFilters extends TransactionPaging {
  type: 'DebitOrder';
  /** Required: the kinds of debit order are never listed together. */
  mandateType: DebitOrderType;
  status?: DebitOrderStatus;
}

export interface CardFilters extends TransactionPaging {
  type: 'Card';
  status?: CardStatus;
}

/** Each transaction type has its own list, with the filters that apply to that type. */
export type TransactionFilters = DebitOrderFilters | CardFilters;

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

/** The agent's list of disputes across all customers. Every filter is optional. */
export interface AgentDisputeFilters {
  status?: DisputeStatus;
  transactionType?: AgentDisputeSummary['transactionType'];
  /** Part of a dispute reference. */
  reference?: string;
  page: number;
  pageSize: number;
}

export interface NotificationFilters {
  page: number;
  pageSize: number;
}

/** Hierarchical query keys, so a whole resource can be invalidated by its prefix. */
export const queryKeys = {
  transactions: {
    all: ['transactions'] as const,
    list: (filters: TransactionFilters) => ['transactions', 'list', filters] as const,
    detail: (id: string) => ['transactions', 'detail', id] as const,
  },
  mandates: {
    all: ['mandates'] as const,
    list: (filters: MandateFilters) => ['mandates', 'list', filters] as const,
    detail: (id: string) => ['mandates', 'detail', id] as const,
  },
  disputeReasons: (transactionId: string) => ['dispute-reasons', transactionId] as const,
  disputes: {
    all: ['disputes'] as const,
    lists: ['disputes', 'list'] as const,
    list: (filters: DisputeFilters) => ['disputes', 'list', filters] as const,
    detail: (id: string) => ['disputes', 'detail', id] as const,
  },
  agentDisputes: {
    all: ['agent-disputes'] as const,
    lists: ['agent-disputes', 'list'] as const,
    list: (filters: AgentDisputeFilters) => ['agent-disputes', 'list', filters] as const,
    detail: (id: string) => ['agent-disputes', 'detail', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters: NotificationFilters) => ['notifications', 'list', filters] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
};
