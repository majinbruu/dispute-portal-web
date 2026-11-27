import { z } from 'zod';

/** The API's limit for a comment, counted after leading and trailing spaces are removed. */
export const COMMENT_MAX_LENGTH = 1000;

export const COMMENT_TOO_LONG = `Comment must be ${COMMENT_MAX_LENGTH} characters or fewer`;

export function fitsCommentLimit(value: string): boolean {
  return value.trim().length <= COMMENT_MAX_LENGTH;
}

/** A comment added to the thread of a dispute: required, unlike the one given when raising it. */
export const commentFormSchema = z.object({
  body: z
    .string()
    .refine((value) => value.trim().length > 0, { error: 'Enter a comment' })
    .refine(fitsCommentLimit, { error: COMMENT_TOO_LONG }),
});

export type CommentFormValues = z.infer<typeof commentFormSchema>;

export const COMMENT_FORM_DEFAULTS: CommentFormValues = { body: '' };
