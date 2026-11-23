import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Problem } from '../lib/problem';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

describe('EmptyState', () => {
  it('shows the title only by default', () => {
    render(<EmptyState title="No debit order history" />);

    expect(screen.getByText('No debit order history')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows a description and an action when given', () => {
    render(
      <EmptyState
        title="No pending disputes"
        description="Disputes you raise will appear here."
        action={<a href="/debit-orders">View debit orders</a>}
      />,
    );

    expect(screen.getByText('Disputes you raise will appear here.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View debit orders' })).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  const problem: Problem = {
    status: 409,
    code: 'already_disputed',
    title: 'Already disputed',
    detail: 'This debit order has already been disputed.',
    traceId: '00-4bf92f3577b34da6-00f067aa0ba902b7-01',
  };

  it('announces the problem detail and shows the trace ID', () => {
    render(<ErrorState problem={problem} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Already disputed');
    expect(alert).toHaveTextContent('This debit order has already been disputed.');
    expect(screen.getByText('00-4bf92f3577b34da6-00f067aa0ba902b7-01')).toBeInTheDocument();
  });

  it('omits the trace line and actions when there are none', () => {
    render(<ErrorState problem={{ ...problem, traceId: undefined }} />);

    expect(screen.queryByText(/Reference for support/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('lets the title be overridden', () => {
    render(<ErrorState problem={problem} title="We could not load your debit orders" />);

    expect(screen.getByText('We could not load your debit orders')).toBeInTheDocument();
    expect(screen.queryByText('Already disputed')).not.toBeInTheDocument();
  });

  it('lists field messages for validation problems', () => {
    render(
      <ErrorState
        problem={{
          status: 400,
          code: 'validation_failed',
          title: 'Validation failed',
          detail: 'One or more fields are invalid.',
          errors: { reasonCode: ['Reason code is not recognised.'] },
        }}
      />,
    );

    expect(screen.getByText('Reason code is not recognised.')).toBeInTheDocument();
  });

  it('offers a retry and extra actions', async () => {
    const onRetry = vi.fn();
    render(<ErrorState problem={problem} onRetry={onRetry} action={<a href="/">Go home</a>} />);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Go home' })).toBeInTheDocument();
  });
});
