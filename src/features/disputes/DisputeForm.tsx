import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { useSubmitDispute } from '../../api/queries';
import type { DisputeReason, SubmitDisputeRequest, Transaction } from '../../api/types';
import { Button, ButtonLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { type DescriptionItem, DescriptionList } from '../../components/DescriptionList';
import { ErrorState } from '../../components/ErrorState';
import { formatDate, formatMoney } from '../../lib/format';
import { disputeReasonLabel, mandateTypeLabel, transactionTypeNoun } from '../../lib/labels';
import { type Problem, toProblem } from '../../lib/problem';
import {
  DISPUTE_FORM_DEFAULTS,
  disputeFormSchema,
  type DisputeFormValues,
} from './disputeFormSchema';
import styles from './Disputes.module.css';
import { cardName } from '../transactions/presentation';
import { describeSubmitError } from './submitErrors';
import { useIdempotencyKey } from './useIdempotencyKey';

type Step = 'details' | 'review';

interface DisputeFormProps {
  transaction: Transaction;
  /** Reasons the API allows for this transaction. */
  reasons: DisputeReason[];
}

function toRequest(transaction: Transaction, values: DisputeFormValues): SubmitDisputeRequest {
  return { transactionId: transaction.id, reasonId: values.reasonId };
}

/** What the review step shows about the transaction; the facts differ by type. */
function reviewItems(transaction: Transaction): DescriptionItem[] {
  const { debitOrder, card } = transaction;
  return [
    { label: card ? 'Merchant' : 'Company', value: transaction.counterpartyName },
    { label: 'Amount', value: formatMoney(transaction.amount, transaction.currency) },
    { label: 'Date', value: formatDate(transaction.effectiveDate) },
    { label: 'Mandate type', value: debitOrder ? mandateTypeLabel(debitOrder.mandateType) : null },
    { label: 'Card', value: card ? cardName(card) : null },
  ];
}

interface SubmitErrorProps {
  problem: Problem;
  transaction: Transaction;
}

function SubmitError({ problem, transaction }: SubmitErrorProps) {
  const view = describeSubmitError(problem);
  return (
    <ErrorState
      problem={problem}
      title={view.message}
      action={
        view.action === 'viewTransaction' ? (
          <ButtonLink to={`/transactions/${transaction.id}`} variant="secondary">
            View this {transactionTypeNoun(transaction.type)}
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
export function DisputeForm({ transaction, reasons }: DisputeFormProps) {
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
    const request = toRequest(transaction, getValues());
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
    const reason = reasons.find((candidate) => candidate.id === values.reasonId);
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
              ...reviewItems(transaction),
              {
                label: 'Reason',
                value: reason ? disputeReasonLabel(reason.label, reason.code) : values.reasonId,
              },
            ]}
          />
        </Card>
        <p className={styles.note}>
          By submitting you confirm that the information above is correct. We will let you know the
          outcome in your inbox.
        </p>
        {submit.isError ? (
          <SubmitError problem={toProblem(submit.error)} transaction={transaction} />
        ) : null}
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
        aria-describedby={errors.reasonId ? reasonErrorId : undefined}
        aria-invalid={errors.reasonId ? true : undefined}
      >
        <legend className={styles.legend}>
          Why are you disputing this {transactionTypeNoun(transaction.type)}?
        </legend>
        <div className={styles.reasons}>
          {reasons.map((reason) => (
            <label key={reason.id} className={styles.reason}>
              <input type="radio" value={reason.id} {...register('reasonId')} />
              <span>{disputeReasonLabel(reason.label, reason.code)}</span>
            </label>
          ))}
        </div>
        {errors.reasonId ? (
          <p id={reasonErrorId} className={styles.fieldError} role="alert">
            {errors.reasonId.message}
          </p>
        ) : null}
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit">Continue</Button>
        <ButtonLink to={`/transactions/${transaction.id}`} variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
