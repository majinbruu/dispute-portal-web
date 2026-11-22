import { z } from 'zod';

export const COMMENT_MAX_LENGTH = 500;

const REASON_REQUIRED = 'Choose a reason for your dispute';

export const disputeFormSchema = z.object({
  // An untouched radio group yields null, so the type error needs the same message.
  reasonCode: z.string({ error: REASON_REQUIRED }).min(1, { error: REASON_REQUIRED }),
  comment: z.string().max(COMMENT_MAX_LENGTH, {
    error: `Comment must be ${COMMENT_MAX_LENGTH} characters or fewer`,
  }),
});

export type DisputeFormValues = z.infer<typeof disputeFormSchema>;

export const DISPUTE_FORM_DEFAULTS: DisputeFormValues = { reasonCode: '', comment: '' };
