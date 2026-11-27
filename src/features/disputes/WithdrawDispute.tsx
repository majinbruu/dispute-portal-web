import { Button } from '../../components/Button';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { useConfirmStep } from '../../components/useConfirmStep';
import styles from './Disputes.module.css';

interface WithdrawDisputeProps {
  onConfirm: () => void;
  /** True while the withdrawal is being sent. */
  pending: boolean;
}

/** The "Withdraw dispute" button and the confirmation step it opens in its place. */
export function WithdrawDispute({ onConfirm, pending }: WithdrawDisputeProps) {
  const confirm = useConfirmStep<'withdraw'>();

  if (confirm.step === null) {
    return (
      <div className={styles.actions}>
        <Button
          ref={confirm.openerRef('withdraw')}
          variant="secondary"
          onClick={() => {
            confirm.open('withdraw');
          }}
        >
          Withdraw dispute
        </Button>
      </div>
    );
  }
  return (
    <ConfirmPanel title="Withdraw this dispute?">
      <p>
        Your dispute will be closed without being reviewed, and nothing will be refunded. This
        cannot be undone.
      </p>
      <div className={styles.actions}>
        <Button onClick={onConfirm} disabled={pending}>
          {pending ? 'Withdrawing…' : 'Yes, withdraw dispute'}
        </Button>
        <Button variant="secondary" onClick={confirm.cancel} disabled={pending}>
          Keep dispute
        </Button>
      </div>
    </ConfirmPanel>
  );
}
