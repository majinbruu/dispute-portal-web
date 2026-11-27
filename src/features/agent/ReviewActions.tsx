import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '../../components/Button';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { useConfirmStep } from '../../components/useConfirmStep';
import styles from './Agent.module.css';
import {
  REJECT_FORM_DEFAULTS,
  REJECT_REASON_MAX_LENGTH,
  rejectFormSchema,
  type RejectFormValues,
} from './rejectSchema';

interface RejectFormProps {
  onReject: (reason: string) => void;
  onCancel: () => void;
  pending: boolean;
}

/** Rejecting needs a reason, so its confirmation step is a short form. */
function RejectForm({ onReject, onCancel, pending }: RejectFormProps) {
  const id = useId();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RejectFormValues>({
    resolver: zodResolver(rejectFormSchema),
    defaultValues: REJECT_FORM_DEFAULTS,
  });
  const reason = useWatch({ control, name: 'reason' });
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const remaining = REJECT_REASON_MAX_LENGTH - reason.trim().length;

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={handleSubmit((values) => {
        onReject(values.reason.trim());
      })}
    >
      <p>
        The dispute will be declined and the customer will see your reason as the outcome. This
        cannot be undone.
      </p>
      <div className={styles.field}>
        <label htmlFor={id} className={styles.fieldLabel}>
          Reason for rejecting
        </label>
        <textarea
          id={id}
          className={styles.textarea}
          rows={3}
          aria-required="true"
          aria-invalid={errors.reason ? true : undefined}
          aria-describedby={errors.reason ? `${hintId} ${errorId}` : hintId}
          {...register('reason')}
        />
        <p id={hintId} className={styles.hint}>
          {remaining >= 0
            ? `${remaining} of ${REJECT_REASON_MAX_LENGTH} characters remaining`
            : `${-remaining} characters over the limit of ${REJECT_REASON_MAX_LENGTH}`}
        </p>
        {errors.reason ? (
          <p id={errorId} className={styles.fieldError} role="alert">
            {errors.reason.message}
          </p>
        ) : null}
      </div>
      <div className={styles.actions}>
        <Button type="submit" disabled={pending}>
          {pending ? 'Rejecting…' : 'Reject dispute'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface ReviewActionsProps {
  onApprove: () => void;
  onReject: (reason: string) => void;
  /** True while either decision is being sent. */
  pending: boolean;
}

/**
 * The agent's decision on a dispute that waits for review. Neither button acts on its own: each
 * opens a confirmation step in its place, because a decision cannot be taken back.
 */
export function ReviewActions({ onApprove, onReject, pending }: ReviewActionsProps) {
  const confirm = useConfirmStep<'approve' | 'reject'>();

  if (confirm.step === 'approve') {
    return (
      <ConfirmPanel title="Approve this dispute?">
        <p>The dispute will be sent for processing. This cannot be undone.</p>
        <div className={styles.actions}>
          <Button onClick={onApprove} disabled={pending}>
            {pending ? 'Approving…' : 'Yes, approve dispute'}
          </Button>
          <Button variant="secondary" onClick={confirm.cancel} disabled={pending}>
            Cancel
          </Button>
        </div>
      </ConfirmPanel>
    );
  }
  if (confirm.step === 'reject') {
    return (
      <ConfirmPanel title="Reject this dispute?">
        <RejectForm onReject={onReject} onCancel={confirm.cancel} pending={pending} />
      </ConfirmPanel>
    );
  }
  return (
    <div className={styles.actions}>
      <Button
        ref={confirm.openerRef('approve')}
        onClick={() => {
          confirm.open('approve');
        }}
      >
        Approve
      </Button>
      <Button
        ref={confirm.openerRef('reject')}
        variant="secondary"
        onClick={() => {
          confirm.open('reject');
        }}
      >
        Reject
      </Button>
    </div>
  );
}
