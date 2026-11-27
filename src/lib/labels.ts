import { humanizeEnum } from './format';

/**
 * Customer-facing wording for values the API sends as codes. The API values themselves are
 * never changed: these are display labels only, kept in one place so every screen agrees.
 */

const MANDATE_TYPE_LABELS: Record<string, string> = {
  DebiCheck: 'DebiCheck',
  Registered: 'Registered Mandate',
  Eft: 'EFT',
};

/**
 * `Registered` is shown as `Registered Mandate`; `DebiCheck` is a product name and stays. An EFT
 * debit order has no mandate, but the API lists it as a third value of the same field.
 */
export function mandateTypeLabel(type: string): string {
  return MANDATE_TYPE_LABELS[type] ?? humanizeEnum(type);
}

const DISPUTE_STATUS_LABELS: Record<string, string> = {
  Submitted: 'Submitted',
  // Customers do not know what "the scheme" is; to them the dispute is being processed.
  SentToScheme: 'Processing',
  Refunded: 'Refunded',
  Declined: 'Declined',
  Withdrawn: 'Withdrawn',
};

export function disputeStatusLabel(status: string): string {
  return DISPUTE_STATUS_LABELS[status] ?? humanizeEnum(status);
}

/**
 * A dispute reason with its scheme reason code in brackets: an ISO 20022 code for a debit order
 * (`The amount is wrong (AM09)`) or a card scheme code for a card transaction (`... (12.5)`).
 */
export function disputeReasonLabel(label: string, code: string): string {
  return code ? `${label} (${code})` : label;
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  DebitOrder: 'Debit order',
  Card: 'Card transaction',
};

/** What a transaction of this type is called: `Debit order` or `Card transaction`. */
export function transactionTypeLabel(type: string): string {
  return TRANSACTION_TYPE_LABELS[type] ?? 'Transaction';
}

/** The same name for use inside a sentence: `debit order` or `card transaction`. */
export function transactionTypeNoun(type: string): string {
  return transactionTypeLabel(type).toLowerCase();
}

const CARD_ENTRY_MODE_LABELS: Record<string, string> = {
  Chip: 'Chip',
  Contactless: 'Tap (contactless)',
  ECommerce: 'Online',
  Recurring: 'Recurring payment',
};

/** How the card was used, in the customer's words rather than the scheme's. */
export function cardEntryModeLabel(entryMode: string): string {
  return CARD_ENTRY_MODE_LABELS[entryMode] ?? humanizeEnum(entryMode);
}

const CARD_VERIFICATION_LABELS: Record<string, string> = {
  Pin: 'PIN',
  ThreeDSecure: '3-D Secure',
  None: 'Not verified',
};

/** How the cardholder was verified when the card was used. */
export function cardVerificationLabel(verification: string): string {
  return CARD_VERIFICATION_LABELS[verification] ?? humanizeEnum(verification);
}
