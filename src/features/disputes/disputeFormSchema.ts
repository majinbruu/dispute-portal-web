import { z } from 'zod';
import { COMMENT_TOO_LONG, fitsCommentLimit } from './commentSchema';

const REASON_REQUIRED = 'Choose a reason for your dispute';

export const disputeFormSchema = z.object({
  // An untouched radio group yields null, so the type error needs the same message.
  reasonId: z.string({ error: REASON_REQUIRED }).min(1, { error: REASON_REQUIRED }),
  // Optional here; it becomes the first comment in the dispute's thread.
  comment: z.string().refine(fitsCommentLimit, { error: COMMENT_TOO_LONG }),
});

export type DisputeFormValues = z.infer<typeof disputeFormSchema>;

export const DISPUTE_FORM_DEFAULTS: DisputeFormValues = { reasonId: '', comment: '' };
