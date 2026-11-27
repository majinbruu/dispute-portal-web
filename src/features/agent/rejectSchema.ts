import { z } from 'zod';

/** The API's limit for a rejection reason, counted after surrounding spaces are removed. */
export const REJECT_REASON_MAX_LENGTH = 500;

export const rejectFormSchema = z.object({
  reason: z
    .string()
    .refine((value) => value.trim().length > 0, {
      error: 'Enter the reason for rejecting this dispute',
    })
    .refine((value) => value.trim().length <= REJECT_REASON_MAX_LENGTH, {
      error: `Reason must be ${REJECT_REASON_MAX_LENGTH} characters or fewer`,
    }),
});

export type RejectFormValues = z.infer<typeof rejectFormSchema>;

export const REJECT_FORM_DEFAULTS: RejectFormValues = { reason: '' };
