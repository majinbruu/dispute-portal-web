import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pager } from './Pager';

function setup(props: Partial<Parameters<typeof Pager>[0]> = {}) {
  const onPageChange = vi.fn();
  render(
    <Pager page={2} totalPages={5} onPageChange={onPageChange} label="Debit orders" {...props} />,
  );
  return { onPageChange, user: userEvent.setup() };
}

describe('Pager', () => {
  it('renders nothing when there is a single page', () => {
    setup({ page: 1, totalPages: 1 });

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('labels the navigation and shows the position', () => {
    setup();

    expect(screen.getByRole('navigation', { name: 'Debit orders pages' })).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
  });

  it('moves to the previous and next page', async () => {
    const { onPageChange, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 3);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 1);
  });

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(
      <Pager page={1} totalPages={3} onPageChange={vi.fn()} label="Items" />,
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();

    rerender(<Pager page={3} totalPages={3} onPageChange={vi.fn()} label="Items" />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('disables both controls while loading', () => {
    setup({ disabled: true });

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
