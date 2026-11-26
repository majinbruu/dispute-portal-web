import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignInScreen } from './SignInScreen';

describe('SignInScreen', () => {
  it('introduces the portal and offers to sign in', () => {
    render(<SignInScreen onSignIn={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 1, name: 'ACME Bank' })).toBeInTheDocument();
    expect(screen.getByText('Debit order disputes')).toBeInTheDocument();
    expect(screen.getByText(/Sign in to view your debit orders and mandates/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('starts sign-in when the button is pressed', async () => {
    const onSignIn = vi.fn();
    render(<SignInScreen onSignIn={onSignIn} />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onSignIn).toHaveBeenCalledOnce();
  });

  it('cannot start a second sign-in while the redirect is starting', async () => {
    const onSignIn = vi.fn();
    render(<SignInScreen onSignIn={onSignIn} busy />);

    const button = screen.getByRole('button', { name: 'Redirecting…' });
    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it('announces a failed attempt and still lets the customer retry', () => {
    render(<SignInScreen onSignIn={vi.fn()} errorMessage="We could not sign you in." />);

    expect(screen.getByRole('alert')).toHaveTextContent('We could not sign you in.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });
});
