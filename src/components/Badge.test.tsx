import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its text with a neutral tone by default', () => {
    render(<Badge>DebiCheck</Badge>);

    expect(screen.getByText('DebiCheck')).toHaveAttribute('data-tone', 'neutral');
  });

  it.each(['success', 'danger', 'warning', 'info'] as const)('supports the %s tone', (tone) => {
    render(<Badge tone={tone}>Status</Badge>);

    expect(screen.getByText('Status')).toHaveAttribute('data-tone', tone);
  });
});
