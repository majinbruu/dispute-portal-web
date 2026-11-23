import { screen, waitFor, within } from '@testing-library/react';
import { paged, problemResponse, requestsTo } from '../../test/apiMock';
import { DEBIT_ORDER_ID, debitOrder, DISPUTE_ID, MANDATE_ID } from '../../test/fixtures';
import { renderApp } from '../../test/renderApp';
import { disputabilityBadge } from './presentation';
import { debitOrderRoutes } from './routes';
import { parseDebitOrderFilters } from './useDebitOrderFilters';

const LIST = 'GET /api/v1/debit-orders';
const DETAIL = `GET /api/v1/debit-orders/${DEBIT_ORDER_ID}`;

const ineligible = debitOrder({
  id: 'rejected-1',
  creditorName: 'SureCover Insurance',
  statementText: 'SURECOVER PREMIUM',
  amount: '1250.50',
  status: 'Rejected',
  mandateType: 'Registered',
  eligibility: {
    canDispute: false,
    code: 'CollectionRejected',
    message: 'This collection was rejected, so no money left your account.',
    lastDisputeDate: '2026-04-09',
  },
});

describe('debit order list', () => {
  it('lists debit orders with amount, date, status, mandate type and disputability', async () => {
    renderApp({
      routes: debitOrderRoutes,
      at: '/debit-orders',
      api: { [LIST]: paged([debitOrder(), ineligible]) },
    });

    const list = await screen.findByRole('list', { name: 'Debit orders' });
    const [first, second] = within(list).getAllByRole('listitem');

    expect(within(first!).getByRole('link')).toHaveAttribute(
      'href',
      `/debit-orders/${DEBIT_ORDER_ID}`,
    );
    expect(first).toHaveTextContent('FitLife Gym');
    expect(first).toHaveTextContent('FITLIFE GYM MEMBERSHIP');
    expect(first).toHaveTextContent(/R\s499,00/);
    expect(first).toHaveTextContent('01 Mar 2026');
    expect(first).toHaveTextContent('Accepted');
    expect(first).toHaveTextContent('DebiCheck');
    expect(first).toHaveTextContent('Can be disputed');

    expect(second).toHaveTextContent(/R\s1\s250,50/);
    expect(second).toHaveTextContent('Rejected');
    expect(second).toHaveTextContent('Registered');
    expect(second).toHaveTextContent('Nothing to dispute');
    expect(screen.getByText('2 debit orders')).toBeInTheDocument();
  });

  it('links the second tab to the dispute history', async () => {
    renderApp({ routes: debitOrderRoutes, at: '/debit-orders', api: { [LIST]: paged([]) } });

    expect(screen.getByRole('link', { name: 'My debit orders' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Dispute history' })).toHaveAttribute(
      'href',
      '/disputes',
    );
    await screen.findByText('No debit order history');
  });

  it('shows the empty state', async () => {
    renderApp({ routes: debitOrderRoutes, at: '/debit-orders', api: { [LIST]: paged([]) } });

    expect(await screen.findByText('No debit order history')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('shows the API problem with its trace ID and retries', async () => {
    let calls = 0;
    const { user } = renderApp({
      routes: debitOrderRoutes,
      at: '/debit-orders',
      api: {
        [LIST]: () => {
          calls += 1;
          return calls === 1
            ? problemResponse(429, 'rate_limited', 'Too many requests. Try again in a minute.')
            : new Response(JSON.stringify(paged([debitOrder()])), {
                headers: { 'Content-Type': 'application/json' },
              });
        },
      },
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load your debit orders');
    expect(alert).toHaveTextContent('Too many requests. Try again in a minute.');
    expect(alert).toHaveTextContent('trace-rate_limited');

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('list', { name: 'Debit orders' })).toBeInTheDocument();
  });

  it('sends filters, sort and page to the API and keeps them in the URL', async () => {
    const { user, fetchMock, router } = renderApp({
      routes: debitOrderRoutes,
      at: '/debit-orders?page=2',
      api: { [LIST]: paged([debitOrder()], { page: 2, totalItems: 25, totalPages: 3 }) },
    });
    await screen.findByRole('list', { name: 'Debit orders' });

    const lastQuery = () =>
      new URL(requestsTo(fetchMock, 'GET', '/api/v1/debit-orders').at(-1)!.url).searchParams;
    expect(Object.fromEntries(lastQuery())).toEqual({
      sort: '-actionDate',
      page: '2',
      pageSize: '10',
    });

    await user.selectOptions(screen.getByLabelText('Status'), 'Rejected');
    await user.selectOptions(screen.getByLabelText('Mandate type'), 'DebiCheck');
    await user.selectOptions(screen.getByLabelText('Sort by'), '-amount');

    await waitFor(() => {
      expect(Object.fromEntries(lastQuery())).toEqual({
        status: 'Rejected',
        mandateType: 'DebiCheck',
        sort: '-amount',
        page: '1',
        pageSize: '10',
      });
    });
    expect(router.state.location.search).toBe(
      '?status=Rejected&mandateType=DebiCheck&sort=-amount',
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(lastQuery().get('page')).toBe('3');
    });
  });

  it('offers to clear filters when nothing matches', async () => {
    const { user, router } = renderApp({
      routes: debitOrderRoutes,
      at: '/debit-orders?status=Rejected',
      api: { [LIST]: paged([]) },
    });

    expect(await screen.findByText('No debit order history')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(router.state.location.search).toBe('');
  });
});

describe('parseDebitOrderFilters', () => {
  it('ignores unknown values instead of sending them to the API', () => {
    const filters = parseDebitOrderFilters(
      new URLSearchParams('status=Bogus&mandateType=x&sort=name&page=-4'),
    );

    expect(filters).toEqual({
      status: undefined,
      mandateType: undefined,
      sort: '-actionDate',
      page: 1,
      pageSize: 10,
    });
  });
});

describe('disputabilityBadge', () => {
  it('describes an existing dispute', () => {
    const badge = disputabilityBadge(
      debitOrder({
        eligibility: { ...ineligible.eligibility, code: 'AlreadyDisputed' },
        dispute: { id: DISPUTE_ID, reference: 'DSP-1', status: 'SentToScheme' },
      }),
    );

    expect(badge).toEqual({ label: 'Dispute: sent to scheme', tone: 'warning' });
  });
});

describe('debit order detail', () => {
  it('shows the details, mandate link and the dispute action when eligible', async () => {
    renderApp({
      routes: debitOrderRoutes,
      at: `/debit-orders/${DEBIT_ORDER_ID}`,
      api: { [DETAIL]: debitOrder() },
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'FitLife Gym' })).toBeVisible();
    expect(screen.getByText('TXN-20260301-0001')).toBeInTheDocument();
    expect(screen.getByText('******4321')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'MND-0001' })).toHaveAttribute(
      'href',
      `/mandates/${MANDATE_ID}`,
    );
    expect(screen.getByText('You can dispute this debit order until 9 April 2026.')).toBeVisible();
    expect(screen.getByText('09 Apr 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dispute this debit order' })).toHaveAttribute(
      'href',
      `/debit-orders/${DEBIT_ORDER_ID}/dispute`,
    );
  });

  it('explains why a debit order cannot be disputed and hides the action', async () => {
    renderApp({
      routes: debitOrderRoutes,
      at: `/debit-orders/${DEBIT_ORDER_ID}`,
      api: {
        [DETAIL]: debitOrder({
          ...ineligible,
          id: DEBIT_ORDER_ID,
          statusReason: 'Insufficient funds',
        }),
      },
    });

    expect(
      await screen.findByText('This collection was rejected, so no money left your account.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dispute this debit order' })).toBeNull();
  });

  it('links to the dispute when one exists', async () => {
    renderApp({
      routes: debitOrderRoutes,
      at: `/debit-orders/${DEBIT_ORDER_ID}`,
      api: {
        [DETAIL]: debitOrder({
          eligibility: {
            canDispute: false,
            code: 'AlreadyDisputed',
            message: 'This debit order has already been disputed.',
            lastDisputeDate: '2026-04-09',
          },
          dispute: { id: DISPUTE_ID, reference: 'DSP-2026-000123', status: 'Submitted' },
        }),
      },
    });

    expect(await screen.findByText('DSP-2026-000123')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View dispute progress' })).toHaveAttribute(
      'href',
      `/disputes/${DISPUTE_ID}`,
    );
    expect(screen.queryByRole('link', { name: 'Dispute this debit order' })).toBeNull();
  });

  it('shows a not-found problem with a way back', async () => {
    renderApp({
      routes: debitOrderRoutes,
      at: `/debit-orders/${DEBIT_ORDER_ID}`,
      api: { [DETAIL]: () => problemResponse(404, 'not_found', 'Debit order not found.') },
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Debit order not found.');
    expect(alert).toHaveTextContent('trace-not_found');
    expect(screen.getByRole('link', { name: /My debit orders/ })).toHaveAttribute(
      'href',
      '/debit-orders',
    );
  });
});
