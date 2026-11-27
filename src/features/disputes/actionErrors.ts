import { ApiError, type Problem, toProblem } from '../../lib/problem';

const OWN_DISPUTE_CODE = 'own_dispute';

/**
 * The refusals a change to a dispute can get, in plain words. The 409s each mean someone else
 * acted on the dispute first; by the time the message is shown the screen has re-read the
 * dispute, so the message says so. The 403 is for an account that holds both roles.
 */
const PLAIN_DETAIL: Record<string, string> = {
  dispute_not_withdrawable:
    'It has already been reviewed, so it can no longer be withdrawn. This page now shows its latest status.',
  dispute_not_awaiting_review:
    'It was already approved, rejected or withdrawn. This page now shows its latest status.',
  dispute_closed:
    'This dispute was closed before your comment was sent. This page now shows its latest status.',
  [OWN_DISPUTE_CODE]:
    'You raised this dispute yourself as a customer, so you cannot review it. Another agent must review it.',
};

/** The problem to show when a change to a dispute fails, in plain words where we know the cause. */
export function describeActionError(error: unknown): Problem {
  const problem = toProblem(error);
  const detail = PLAIN_DETAIL[problem.code];
  return detail ? { ...problem, detail } : problem;
}

/**
 * True when the API refused an agent's action because the agent raised the dispute themselves.
 * Only the API can tell, so the screen learns it from this answer and not in advance.
 */
export function isOwnDispute(error: unknown): boolean {
  return error instanceof ApiError && error.code === OWN_DISPUTE_CODE;
}
