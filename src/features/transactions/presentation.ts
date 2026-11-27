import type {
  CardDetail,
  CardStatus,
  DebitOrderStatus,
  Transaction,
  TransactionSort,
  TransactionType,
} from '../../api/types';
import type { BadgeTone } from '../../components/Badge';

export const DEBIT_ORDER_STATUS_TONE: Record<DebitOrderStatus, BadgeTone> = {
  Accepted: 'success',
  Rejected: 'danger',
};

export const CARD_STATUS_TONE: Record<CardStatus, BadgeTone> = {
  Settled: 'success',
  Pending: 'warning',
  Declined: 'danger',
  Reversed: 'neutral',
};

export const SORT_LABEL: Record<TransactionSort, string> = {
  '-effectiveDate': 'Newest first',
  effectiveDate: 'Oldest first',
  '-amount': 'Highest amount',
  amount: 'Lowest amount',
};

/** The list a transaction of this type appears in: each type has its own tab. */
export function transactionListPath(type: TransactionType): string {
  return type === 'Card' ? '/transactions?type=Card' : '/transactions';
}

/** The card a transaction was made with, e.g. `Visa ************4821`. */
export function cardName(card: CardDetail): string {
  return `${card.scheme} ${card.cardNumberMasked}`;
}

/**
 * The line under a transaction's name that helps the customer recognise it: the statement text
 * of a debit order, or the card and town of a card transaction.
 */
export function transactionSummary(transaction: Transaction): string | undefined {
  if (transaction.debitOrder) return transaction.debitOrder.statementText;
  if (transaction.card) return `${cardName(transaction.card)} · ${transaction.card.merchantCity}`;
  return undefined;
}
