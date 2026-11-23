import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Badge } from './Badge';
import { Button, ButtonLink } from './Button';
import { Card } from './Card';
import { DescriptionList } from './DescriptionList';
import { ItemList, ItemRow } from './ItemList';
import { PageHeader } from './PageHeader';
import { Spinner } from './Spinner';
import { TabNav } from './TabNav';

describe('Button', () => {
  it('is a plain button by default so it never submits a form by accident', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Continue</Button>);

    const button = screen.getByRole('button', { name: 'Continue' });
    await userEvent.click(button);

    expect(button).toHaveAttribute('type', 'button');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('can be a submit button and can be disabled', () => {
    render(
      <Button type="submit" variant="secondary" block disabled>
        Submit
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toBeDisabled();
  });

  it('renders a router link styled as a button', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/debit-orders" variant="ghost">
          Back
        </ButtonLink>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/debit-orders');
  });
});

describe('Spinner', () => {
  it('announces a default loading message', () => {
    render(<Spinner />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('accepts a specific label and an inline layout', () => {
    render(<Spinner label="Loading debit orders…" inline />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading debit orders…');
  });
});

describe('ItemList', () => {
  it('renders linked rows with their details', () => {
    render(
      <MemoryRouter>
        <ItemList label="Debit orders">
          <ItemRow
            to="/debit-orders/1"
            title="Gym Co"
            subtitle="GYMCO 123"
            value="R 499,00"
            meta="01 Mar 2026"
            badges={<Badge tone="success">Successful</Badge>}
          />
          <ItemRow to="/debit-orders/2" title="Insurer" />
        </ItemList>
      </MemoryRouter>,
    );

    const list = screen.getByRole('list', { name: 'Debit orders' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);

    const first = within(rows[0]!).getByRole('link');
    expect(first).toHaveAttribute('href', '/debit-orders/1');
    expect(first).toHaveTextContent('Gym Co');
    expect(first).toHaveTextContent('GYMCO 123');
    expect(first).toHaveTextContent('R 499,00');
    expect(first).toHaveTextContent('01 Mar 2026');
    expect(first).toHaveTextContent('Successful');
    expect(within(rows[1]!).getByRole('link')).toHaveTextContent('Insurer');
  });
});

describe('DescriptionList', () => {
  it('renders label and value pairs and skips empty values', () => {
    render(
      <DescriptionList
        items={[
          { label: 'Transaction ID', value: 'TXN-1' },
          { label: 'Outcome', value: null },
          { label: 'Reason', value: '' },
          { label: 'Collection day', value: 0 },
        ]}
      />,
    );

    expect(screen.getByText('Transaction ID')).toBeInTheDocument();
    expect(screen.getByText('TXN-1')).toBeInTheDocument();
    expect(screen.queryByText('Outcome')).not.toBeInTheDocument();
    expect(screen.queryByText('Reason')).not.toBeInTheDocument();
    expect(screen.getByText('Collection day')).toBeInTheDocument();
  });
});

describe('Card', () => {
  it('is a labelled region when it has a title', () => {
    render(<Card title="Mandate">Body</Card>);

    const region = screen.getByRole('region', { name: 'Mandate' });
    expect(within(region).getByRole('heading', { level: 2, name: 'Mandate' })).toBeInTheDocument();
  });

  it('is a plain container without a title', () => {
    render(<Card>Body</Card>);

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});

describe('PageHeader', () => {
  it('renders the page heading with an optional description and back link', () => {
    render(
      <MemoryRouter>
        <PageHeader
          title="Debit order"
          description="Details of this collection."
          back={{ to: '/debit-orders', label: 'My debit orders' }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Debit order' })).toBeInTheDocument();
    expect(screen.getByText('Details of this collection.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /My debit orders/ })).toHaveAttribute(
      'href',
      '/debit-orders',
    );
  });

  it('renders just the heading when nothing else is given', () => {
    render(
      <MemoryRouter>
        <PageHeader title="Inbox" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('TabNav', () => {
  it('marks the tab for the current route', () => {
    render(
      <MemoryRouter initialEntries={['/disputes']}>
        <TabNav
          label="Debit orders and disputes"
          tabs={[
            { to: '/debit-orders', label: 'My debit orders' },
            { to: '/disputes', label: 'Dispute history' },
          ]}
        />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: 'Debit orders and disputes' });
    expect(within(nav).getByRole('link', { name: 'Dispute history' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'My debit orders' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
