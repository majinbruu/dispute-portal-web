import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoAccessScreen } from './NoAccessScreen';

const signOut = vi.fn();

vi.mock('./useSession', () => ({
  useSession: () => ({ displayName: 'Sam Visitor', role: undefined, signOut }),
}));

describe('NoAccessScreen', () => {
  it('says who is signed in and that the account has no access', () => {
    render(<NoAccessScreen />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'You do not have access' })).toBeVisible();
    expect(screen.getByText('ACME Bank')).toBeInTheDocument();
    expect(
      screen.getByText(
        /You are signed in as Sam Visitor, but this account is not set up to use the dispute portal as a customer or as an agent/,
      ),
    ).toBeInTheDocument();
    expect(document.title).toBe('No access | ACME Bank');
  });

  it('offers only a way to sign out', async () => {
    render(<NoAccessScreen />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(signOut).toHaveBeenCalledOnce();
  });
});
