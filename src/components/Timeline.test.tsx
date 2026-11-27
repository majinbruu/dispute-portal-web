import { render, screen, within } from '@testing-library/react';
import { Timeline, type TimelineItem } from './Timeline';

const items: TimelineItem[] = [
  {
    id: '1',
    occurredAt: '2026-03-01T08:15:00Z',
    title: 'Submitted',
    description: 'We received your dispute.',
  },
  { id: '2', occurredAt: '2026-03-02T09:45:00Z', title: 'Processing' },
  {
    id: '3',
    occurredAt: '2026-03-02T10:05:00Z',
    title: 'Refunded',
    description: 'The amount was paid back into your account.',
  },
];

describe('Timeline', () => {
  it('says who caused a step when the screen gives it', () => {
    render(
      <Timeline
        items={[{ ...items[0]!, actor: 'Customer' }, items[1]!]}
        label="Audit trail"
        timeZone="UTC"
      />,
    );

    const [first, second] = screen.getAllByRole('listitem');
    expect(first).toHaveTextContent(/Customer · .*08:15/);
    expect(second).not.toHaveTextContent('·');
  });

  it('renders each step in order inside a labelled list', () => {
    render(<Timeline items={items} label="Dispute progress" timeZone="UTC" />);

    const list = screen.getByRole('list', { name: 'Dispute progress' });
    const steps = within(list).getAllByRole('listitem');

    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent('Submitted');
    expect(steps[1]).toHaveTextContent('Processing');
    expect(steps[2]).toHaveTextContent('Refunded');
  });

  it('shows the date badge, description and time of a step', () => {
    render(<Timeline items={items} label="Dispute progress" timeZone="UTC" />);

    const first = screen.getAllByRole('listitem')[0]!;
    expect(within(first).getByText('01')).toBeInTheDocument();
    expect(within(first).getByText('Mar')).toBeInTheDocument();
    expect(within(first).getByText('We received your dispute.')).toBeInTheDocument();
    expect(within(first).getByText('08:15')).toBeInTheDocument();
    expect(first.querySelector('time')).toHaveAttribute('dateTime', '2026-03-01T08:15:00Z');
  });

  it('marks only the latest step as current', () => {
    render(<Timeline items={items} label="Dispute progress" timeZone="UTC" />);

    const steps = screen.getAllByRole('listitem');
    expect(steps[0]).not.toHaveAttribute('aria-current');
    expect(steps[2]).toHaveAttribute('aria-current', 'step');
  });

  it('formats times in the requested time zone', () => {
    render(<Timeline items={items} label="Dispute progress" timeZone="Africa/Johannesburg" />);

    expect(screen.getByText('10:15')).toBeInTheDocument();
  });

  it('copes with an unparseable timestamp', () => {
    render(
      <Timeline
        items={[{ id: 'x', occurredAt: 'not-a-date', title: 'Submitted' }]}
        label="Dispute progress"
      />,
    );

    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('renders an empty list without steps', () => {
    render(<Timeline items={[]} label="Dispute progress" />);

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
