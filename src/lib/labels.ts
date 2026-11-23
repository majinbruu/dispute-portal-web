import { humanizeEnum } from './format';

/**
 * Customer-facing wording for values the API sends as codes. The API values themselves are
 * never changed: these are display labels only, kept in one place so every screen agrees.
 */

const MANDATE_TYPE_LABELS: Record<string, string> = {
  DebiCheck: 'DebiCheck',
  Registered: 'Registered Mandate',
};

/** `Registered` is shown as `Registered Mandate`; `DebiCheck` is a product name and stays. */
export function mandateTypeLabel(type: string): string {
  return MANDATE_TYPE_LABELS[type] ?? humanizeEnum(type);
}

const DISPUTE_STATUS_LABELS: Record<string, string> = {
  Submitted: 'Submitted',
  // Customers do not know what "the scheme" is; to them the dispute is being processed.
  SentToScheme: 'Processing',
  Refunded: 'Refunded',
  Declined: 'Declined',
};

export function disputeStatusLabel(status: string): string {
  return DISPUTE_STATUS_LABELS[status] ?? humanizeEnum(status);
}

/** A dispute reason with its ISO 20022 reason code, e.g. `The amount is wrong (AM09)`. */
export function disputeReasonLabel(description: string, code: string): string {
  return code ? `${description} (${code})` : description;
}
