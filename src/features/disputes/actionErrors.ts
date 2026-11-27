import { type Problem, toProblem } from '../../lib/problem';

/**
 * The 409s a change to a dispute can get. Each means someone else acted on the dispute first.
 * By the time the message is shown the screen has re-read the dispute, so the message says so.
 */
const STALE_DETAIL: Record<string, string> = {
  dispute_not_withdrawable:
    'It has already been reviewed, so it can no longer be withdrawn. This page now shows its latest status.',
  dispute_not_awaiting_review:
    'It was already approved, rejected or withdrawn. This page now shows its latest status.',
  dispute_closed:
    'This dispute was closed before your comment was sent. This page now shows its latest status.',
};

/** The problem to show when a change to a dispute fails, in plain words where we know the cause. */
export function describeActionError(error: unknown): Problem {
  const problem = toProblem(error);
  const detail = STALE_DETAIL[problem.code];
  return detail ? { ...problem, detail } : problem;
}
