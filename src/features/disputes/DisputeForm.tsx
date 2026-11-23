import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { useSubmitDispute } from '../../api/queries';
import type { DebitOrder, DisputeReason, SubmitDisputeRequest } from '../../api/types';
import { Button, ButtonLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { DescriptionList } from '../../components/DescriptionList';
import { ErrorState } from '../../components/ErrorState';
import { formatDate, formatMoney } from '../../lib/format';
import { type Problem, toProblem } from '../../lib/problem';
import {
  DISPUTE_FORM_DEFAULTS,
  disputeFormSchema,
  type DisputeFormValues,
} from './disputeFormSchema';
import styles from './Disputes.module.css';
import { describeSubmitError } from './submitErrors';
import { useIdempotencyKey } from './useIdempotencyKey';

type Step = 'details' | 'review';

interface DisputeFormProps {
  order: DebitOrder;
  /** Reasons the API allows for this debit order's mandate type. */
  reasons: DisputeReason[];
}

function toRequest(order: DebitOrder, values: DisputeFormValues): SubmitDisputeRequest {
  return { debitOrderId: order.id, reasonCode: values.reasonCode };
}

interface SubmitErrorProps {
  problem: Problem;
  order: DebitOrder;
}

function SubmitError({ problem, order }: SubmitErrorProps) {
  const view = describeSubmitError(problem);
  return (
    <ErrorState
      problem={problem}
      title={view.message}
      action={
        view.action === 'viewDebitOrder' ? (
          <ButtonLink to={`/debit-orders/${order.id}`} variant="secondary">
            View this debit order
          </ButtonLink>
        ) : view.action === 'viewDisputes' ? (
          <ButtonLink to="/disputes" variant="secondary">
            View dispute history
          </ButtonLink>
        ) : undefined
      }
    />
  );
}

/**
 * The two-step dispute form: choose a reason, then review and submit. Nothing is sent until the
 * customer confirms on the review step.
 */
export function DisputeForm({ order, reasons }: DisputeFormProps) {
  const id = useId();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('details');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const idempotencyKeyFor = useIdempotencyKey();
  const submit = useSubmitDispute();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<DisputeFormValues>({
    resolver: zodResolver(disputeFormSchema),
    defaultValues: DISPUTE_FORM_DEFAULTS,
  });

  useEffect(() => {
    // Moving between steps replaces the content, so move focus to the new step's heading for
    // keyboard and screen reader users. Not on mount: the page heading comes first.
    if (previousStep.current !== step) {
      previousStep.current = step;
      headingRef.current?.focus();
    }
  }, [step]);

  const onSubmit = () => {
    const request = toRequest(order, getValues());
    submit.mutate(
      { request, idempotencyKey: idempotencyKeyFor(request) },
      {
        onSuccess: (dispute) => {
          void navigate(`/disputes/${dispute.id}`, { replace: true });
        },
      },
    );
  };

  if (step === 'review') {
    const values = getValues();
    const reason = reasons.find((candidate) => candidate.code === values.reasonCode);
    return (
      <div className={styles.form}>
        <div>
          <p className={styles.step}>Step 2 of 2</p>
          <h2 ref={headingRef} tabIndex={-1} className={styles.stepHeading}>
            Review your dispute
          </h2>
        </div>
        <Card>
          <DescriptionList
            items={[
              { label: 'Company', value: order.creditorName },
              { label: 'Amount', value: formatMoney(order.amount, order.currency) },
              { label: 'Date', value: formatDate(order.actionDate) },
              { label: 'Reason', value: reason?.description ?? values.reasonCode },
            ]}
          />
        </Card>
        <p className={styles.note}>
          By submitting you confirm that the information above is correct. We will let you know the
          outcome in your inbox.
        </p>
        {submit.isError ? <SubmitError problem={toProblem(submit.error)} order={order} /> : null}
        <div className={styles.actions}>
          <Button onClick={onSubmit} disabled={submit.isPending}>
            {submit.isPending ? 'Submitting…' : 'Submit dispute'}
          </Button>
          <Button
            variant="secondary"
            disabled={submit.isPending}
            onClick={() => {
              submit.reset();
              setStep('details');
            }}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  const reasonErrorId = `${id}-reason-error`;

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={handleSubmit(() => {
        setStep('review');
      })}
    >
      <div>
        <p className={styles.step}>Step 1 of 2</p>
        <h2 ref={headingRef} tabIndex={-1} className={styles.stepHeading}>
          Tell us why
        </h2>
      </div>

      <fieldset
        aria-describedby={errors.reasonCode ? reasonErrorId : undefined}
        aria-invalid={errors.reasonCode ? true : undefined}
      >
        <legend className={styles.legend}>Why are you disputing this debit order?</legend>
        <div className={styles.reasons}>
          {reasons.map((reason) => (
            <label key={reason.code} className={styles.reason}>
              <input type="radio" value={reason.code} {...register('reasonCode')} />
              <span>{reason.description}</span>
            </label>
          ))}
        </div>
        {errors.reasonCode ? (
          <p id={reasonErrorId} className={styles.fieldError} role="alert">
            {errors.reasonCode.message}
          </p>
        ) : null}
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit">Continue</Button>
        <ButtonLink to={`/debit-orders/${order.id}`} variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
