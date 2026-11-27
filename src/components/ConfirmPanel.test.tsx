import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Button } from './Button';
import { ConfirmPanel } from './ConfirmPanel';
import { SuccessMessage } from './SuccessMessage';
import { useConfirmStep } from './useConfirmStep';

/** Two actions that each need confirming, as on the agent's dispute screen. */
function Review({ onApprove }: { onApprove: () => void }) {
  const confirm = useConfirmStep<'approve' | 'reject'>();
  const [approved, setApproved] = useState(false);

  if (approved) {
    return <SuccessMessage>Dispute approved.</SuccessMessage>;
  }
  if (confirm.step) {
    return (
      <ConfirmPanel title={confirm.step === 'approve' ? 'Approve?' : 'Reject?'}>
        <p>This cannot be undone.</p>
        <Button
          onClick={() => {
            onApprove();
            setApproved(true);
          }}
        >
          Yes
        </Button>
        <Button variant="secondary" onClick={confirm.cancel}>
          Cancel
        </Button>
      </ConfirmPanel>
    );
  }
  return (
    <>
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
        onClick={() => {
          confirm.open('reject');
        }}
      >
        Reject
      </Button>
    </>
  );
}

describe('confirmation step', () => {
  it('replaces the buttons with a labelled question that takes focus', async () => {
    const onApprove = vi.fn();
    render(<Review onApprove={onApprove} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));

    const panel = screen.getByRole('group', { name: 'Reject?' });
    expect(panel).toHaveTextContent('This cannot be undone.');
    expect(screen.getByRole('heading', { level: 3, name: 'Reject?' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(onApprove).not.toHaveBeenCalled();
  });

  it('returns focus to the button that opened the step when it is cancelled', async () => {
    render(<Review onApprove={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Approve' })).toHaveFocus();
  });

  it('can be operated with the keyboard alone', async () => {
    const onApprove = vi.fn();
    render(<Review onApprove={onApprove} />);

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Approve?' })).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Yes' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    expect(onApprove).toHaveBeenCalledOnce();
  });

  it('announces the result and moves focus to it once the buttons are gone', async () => {
    render(<Review onApprove={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }));

    const result = screen.getByRole('status');
    expect(result).toHaveTextContent('Dispute approved.');
    expect(result).toHaveFocus();
  });
});
