import type { Problem } from '../../lib/problem';

export type SubmitErrorAction = 'viewDebitOrder' | 'viewDisputes' | 'changeReason' | 'retry';

export interface SubmitErrorView {
  /** Plain-language summary of what went wrong; the API's own detail is shown underneath. */
  message: string;
  /** What the customer can usefully do next. */
  action: SubmitErrorAction;
}

/** Every error code `POST /disputes` is documented to return, mapped to a clear message. */
const BY_CODE: Record<string, SubmitErrorView> = {
  already_disputed: {
    message: 'This debit order has already been disputed',
    action: 'viewDebitOrder',
  },
  dispute_window_closed: {
    message: 'The time allowed to dispute this debit order has passed',
    action: 'viewDebitOrder',
  },
  within_mandate_terms: {
    message: 'This debit order was collected within the terms of your mandate',
    action: 'viewDebitOrder',
  },
  collection_failed: {
    message: 'This collection failed, so there is nothing to dispute',
    action: 'viewDebitOrder',
  },
  reason_not_allowed: {
    message: 'That reason cannot be used for this debit order',
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
  not_found: {
    message: 'We could not find this debit order',
    action: 'viewDebitOrder',
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
