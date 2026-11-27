import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { formatDateTime } from '../../lib/format';
import type { Problem } from '../../lib/problem';
import { describeActionError } from './actionErrors';
import {
  COMMENT_FORM_DEFAULTS,
  COMMENT_MAX_LENGTH,
  commentFormSchema,
  type CommentFormValues,
} from './commentSchema';
import styles from './Disputes.module.css';

const TITLE = 'Comments';

/** One comment as a screen shows it; who the author is called depends on who is reading. */
export interface CommentView {
  id: string;
  author: string;
  /** Extra identification of the author, for screens that show it. */
  authorDetail?: string;
  body: string;
  createdAt: string;
}

interface CommentFormProps {
  /** Sends the comment; resolves to true when it was added. */
  onSubmit: (body: string) => Promise<boolean>;
}

function CommentForm({ onSubmit }: CommentFormProps) {
  const id = useId();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: COMMENT_FORM_DEFAULTS,
  });
  const body = useWatch({ control, name: 'body' });
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const remaining = COMMENT_MAX_LENGTH - body.trim().length;

  return (
    <form
      className={styles.field}
      noValidate
      onSubmit={handleSubmit(async (values) => {
        // Keep what was typed if the comment was not added, so it can be sent again.
        if (await onSubmit(values.body.trim())) reset();
      })}
    >
      <label htmlFor={id} className={styles.label}>
        Add a comment
      </label>
      <textarea
        id={id}
        className={styles.textarea}
        rows={3}
        aria-invalid={errors.body ? true : undefined}
        aria-describedby={errors.body ? `${hintId} ${errorId}` : hintId}
        {...register('body')}
      />
      <p id={hintId} className={styles.hint}>
        {remaining >= 0
          ? `${remaining} of ${COMMENT_MAX_LENGTH} characters remaining`
          : `${-remaining} characters over the limit of ${COMMENT_MAX_LENGTH}`}
      </p>
      {errors.body ? (
        <p id={errorId} className={styles.fieldError} role="alert">
          {errors.body.message}
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add comment'}
        </Button>
      </div>
    </form>
  );
}

interface CommentsProps {
  /** Oldest first, as the API returns them. */
  comments: CommentView[];
  /** Comments can be added only while the dispute is open. */
  canComment: boolean;
  /** Sends a new comment; rejects with the API's error when it was not added. */
  onAdd: (body: string) => Promise<unknown>;
}

/**
 * The comment thread of a dispute, shared by the customer's and the agent's screens, with the
 * form to add a comment while the dispute is open. Once the dispute is closed the form is simply
 * not there, and a closed dispute without comments has no thread to show.
 */
export function Comments({ comments, canComment, onAdd }: CommentsProps) {
  const [problem, setProblem] = useState<Problem>();
  const [added, setAdded] = useState(false);

  const add = async (body: string) => {
    setProblem(undefined);
    setAdded(false);
    try {
      await onAdd(body);
      setAdded(true);
      return true;
    } catch (error) {
      setProblem(describeActionError(error));
      return false;
    }
  };

  if (!canComment && comments.length === 0 && !problem) return null;

  return (
    <Card title={TITLE}>
      {comments.length === 0 ? (
        <p className={styles.note}>No comments yet.</p>
      ) : (
        <ol className={styles.thread} aria-label={TITLE}>
          {comments.map((comment) => (
            <li key={comment.id} className={styles.threadItem}>
              <p className={styles.threadMeta}>
                <span className={styles.threadAuthor}>{comment.author}</span>
                {comment.authorDetail ? <span>{comment.authorDetail}</span> : null}
                <time dateTime={comment.createdAt}>{formatDateTime(comment.createdAt)}</time>
              </p>
              <p className={styles.comment}>{comment.body}</p>
            </li>
          ))}
        </ol>
      )}
      {/* Always in the page so that screen readers announce the text when it changes. */}
      <p className="visually-hidden" role="status">
        {added ? 'Your comment was added.' : ''}
      </p>
      {/* Shown here, not in the form: after a 409 the dispute is closed and the form is gone. */}
      {problem ? <ErrorState problem={problem} title="Your comment was not added" /> : null}
      {canComment ? <CommentForm onSubmit={add} /> : null}
    </Card>
  );
}
