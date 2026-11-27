import type { Problem } from '../../lib/problem';

export type SubmitErrorAction = 'viewTransaction' | 'viewDisputes' | 'changeReason' | 'retry';

export interface SubmitErrorView {
  /** Plain-language summary of what went wrong; the API's own detail is shown underneath. */
  message: string;
  /** What the customer can usefully do next. */
  action: SubmitErrorAction;
}

/** Every error code `POST /disputes` is documented to return, mapped to a clear message. */
const BY_CODE: Record<string, SubmitErrorView> = {
  already_disputed: {
    message: 'This transaction has already been disputed',
    action: 'viewTransaction',
  },
  dispute_window_closed: {
    message: 'The time allowed to dispute this transaction has passed',
    action: 'viewTransaction',
  },
  within_mandate_terms: {
    message: 'This debit order was collected within the terms of your mandate',
    action: 'viewTransaction',
  },
  collection_rejected: {
    message: 'This collection was rejected, so there is nothing to dispute',
    action: 'viewTransaction',
  },
  not_a_purchase: {
    message: 'Only card purchases can be disputed here',
    action: 'viewTransaction',
  },
  not_settled: {
    message: 'This card transaction has not been settled yet',
    action: 'viewTransaction',
  },
  fully_refunded: {
    message: 'This card transaction has already been refunded in full',
    action: 'viewTransaction',
  },
  reason_not_allowed: {
    message: 'That reason cannot be used for this transaction',
    action: 'changeReason',
  },
  idempotency_key_reused: {
    message: 'Your dispute may already have been submitted',
    action: 'viewDisputes',
  },
  validation_failed: {
    message: 'Some of the details you entered are not valid',
    action: 'changeReason',
  },
  rate_limited: {
    message: 'Too many attempts. Wait a moment, then try again',
    action: 'retry',
  },
  transaction_not_found: {
    message: 'We could not find this transaction',
    action: 'viewTransaction',
  },
  network_error: {
    message: 'We could not confirm your dispute. It is safe to try again',
    action: 'retry',
  },
};

const FALLBACK: SubmitErrorView = {
  message: 'We could not submit your dispute',
  action: 'retry',
};

export function describeSubmitError(problem: Problem): SubmitErrorView {
  return BY_CODE[problem.code] ?? FALLBACK;
}
