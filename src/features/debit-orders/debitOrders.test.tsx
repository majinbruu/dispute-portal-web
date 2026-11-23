import { screen, waitFor, within } from '@testing-library/react';
import { paged, problemResponse, requestsTo } from '../../test/apiMock';
import { DEBIT_ORDER_ID, debitOrder, DISPUTE_ID, MANDATE_ID } from '../../test/fixtures';
import { renderApp } from '../../test/renderApp';
import { debitOrderRoutes } from './routes';
import { parseDebitOrderFilters } from './useDebitOrderFilters';

const LIST = 'GET /api/v1/debit-orders';
const DETAIL = `GET /api/v1/debit-orders/${DEBIT_ORDER_ID}`;

const rejected = debitOrder({
  id: 'rejected-1',
  creditorName: 'SureCover Insurance',
  statementText: 'SURECOVER PREMIUM',
  amount: '1250.50',
  status: 'Rejected',
  statusReason: 'Insufficient funds',
  eligibility: {
    canDispute: false,
    code: 'CollectionRejected',
    message: 'This collection was rejected, so no money left your account.',
    lastDisputeDate: '2026-04-09',
  },
});

const disputed = debitOrder({
  id: 'disputed-1',
  creditorName: 'StreamBox',
  eligibility: {
    canDispute: false,
    code: 'AlreadyDisputed',
    message: 'This debit order has already been disputed.',
    lastDisputeDate: '2026-04-09',
  },
  dispute: { id: DISPUTE_ID, reference: 'DSP-2026-000123', status: 'SentToScheme' },
});

/** Wording the customer must never see: why something cannot be disputed. */
const INELIGIBILITY_TEXT =
  /cannot be disputed|can be disputed|nothing to dispute|within mandate terms|window closed|last day|was rejected, so|until 9 April/i;

describe('debit order list', () => {
  it('lists debit orders with amount, date, mandate type and status', async () => {
    renderApp({
      routes: debitOrderRoutes,
      at: '/debit-orders',
      api: { [LIST]: paged([debitOrder(), rejected]) },
    });

    const list = await screen.findByRole('list', { name: 'Debit orders' });
    const [first, second] = within(list).getAllByRole('listitem');

    expect(within(first!).getAllByRole('link')[0]).toHaveAttribute(
      'href',
      `/debit-orders/${DEBIT_ORDER_ID}`,
    );
    expect(first).toHaveTextContent('FITLIFE GYM MEMBERSHIP');
    expect(first).toHaveTextContent(/R\s499,00/);
    expect(first).toHaveTextContent('01 Mar 2026');
    // The mandate type chip comes before the status chip.
    expect(first).toHaveTextContent(/DebiCheck\s*Accepted/);

    expect(second).toHaveTextContent(/R\s1\s250,50/);
    expect(second).toHaveTextContent(/DebiCheck\s*Rejected/);
    expect(screen.getByText('2 DebiCheck debit orders')).toBeInTheDocument();
  });

  it('labels the Registered type as Registered Mandate', async () => {
    renderApp({
      routes: debitOrderRoutes,
      at: '/debit-orders?mandateType=Registered',
      api: { [LIST]: paged([debitOrder({ mandateType: 'Registered' })]) },
    });

    const list = await screen.findByRole('list', { name: 'Debit orders' });
    expect(within(list).getByRole('listitem')).toHaveTextContent(/Registered Mandate\s*Accepted/);
    expect(screen.getByText('1 Registered Mandate debit order')).toBeInTheDocument();
    expect(screen.getByLabelText('Mandate type')).toHaveValue('Registered');
  });

  it('offers Dispute only on rows the API says can be disputed', async () => {
    renderApp({
      routes: debitOrderRoutes,
      at: '/debit-orders',
      api: { [LIST]: paged([debitOrder(), rejected, disputed]) },
    });

    const list = await screen.findByRole('list', { name: 'Debit orders' });
    const [eligibleRow, rejectedRow, disputedRow] = within(list).getAllByRole('listitem');

    const dispute = within(eligibleRow!).getByRole('link', { name: /^Dispute / });
    expect(dispute).toHaveTextContent(/^Dispute$/);
    expect(dispute).toHaveAttribute('href', `/debit-orders/${DEBIT_ORDER_ID}/dispute`);
    // Two separate links in the row, neither inside the other.
    expect(within(eligibleRow!).getAllByRole('link')).toHaveLength(2);
    expect(dispute.closest('a')!.parentElement!.closest('a')).toBeNull();

    expect(within(rejectedRow!).getAllByRole('link')).toHaveLength(1);
    expect(within(rejectedRow!).queryByText('Dispute')).not.toBeInTheDocument();

    expect(within(disputedRow!).queryByText('Dispute')).not.toBeInTheDocument();
    expect(disputedRow).toHaveTextContent('Dispute: processing');
    expect(within(disputedRow!).getByRole('link', { name: /^View dispute/ })).toHaveAttribute(
      'href',
      `/disputes/${DISPUTE_ID}`,
    );
  });

  it('never says why a debit order cannot be disputed', async () => {
    renderApp({
      routes: debitOrderRoutes,
      at: '/debit-orders',
      api: { [LIST]: paged([debitOrder(), rejected, disputed]) },
    });

    const list = await screen.findByRole('list', { name: 'Debit orders' });
    expect(list).not.toHaveTextContent(INELIGIBILITY_TEXT);
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
    expect(screen.queryByRole('button', { name: 'Show all statuses' })).not.toBeInTheDocument();
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

  describe('filters', () => {
    const lastQuery = (fetchMock: ReturnType<typeof renderApp>['fetchMock']) =>
      Object.fromEntries(
        new URL(requestsTo(fetchMock, 'GET', '/api/v1/debit-orders').at(-1)!.url).searchParams,
      );

    it('orders the filters mandate type, status, sort', async () => {
      renderApp({ routes: debitOrderRoutes, at: '/debit-orders', api: { [LIST]: paged([]) } });
      await screen.findByText('No debit order history');

      const form = screen.getByRole('form', { name: 'Filter debit orders' });
      expect(
        within(form)
          .getAllByRole('combobox')
          .map((select) => select.getAttribute('id'))
          .map((id) => form.querySelector(`label[for="${id}"]`)!.textContent),
      ).toEqual(['Mandate type', 'Status', 'Sort by']);
    });

    it('offers exactly two mandate types with no "all" option, and three statuses', async () => {
      renderApp({ routes: debitOrderRoutes, at: '/debit-orders', api: { [LIST]: paged([]) } });
      await screen.findByText('No debit order history');

      const options = (label: string) =>
        within(screen.getByLabelText(label))
          .getAllByRole('option')
          .map((option) => option.textContent);
      expect(options('Mandate type')).toEqual(['DebiCheck', 'Registered Mandate']);
      expect(options('Status')).toEqual(['All statuses', 'Accepted', 'Rejected']);
    });

    it('defaults to DebiCheck, sends it to the API and writes it to the URL', async () => {
      const { fetchMock, router } = renderApp({
        routes: debitOrderRoutes,
        at: '/debit-orders',
        api: { [LIST]: paged([debitOrder()]) },
      });
      await screen.findByRole('list', { name: 'Debit orders' });

      expect(screen.getByLabelText('Mandate type')).toHaveValue('DebiCheck');
      expect(lastQuery(fetchMock)).toEqual({
        mandateType: 'DebiCheck',
        sort: '-actionDate',
        page: '1',
        pageSize: '10',
      });
      await waitFor(() => {
        expect(router.state.location.search).toBe('?mandateType=DebiCheck');
      });
      // Every request named a mandate type: the two kinds are never fetched together.
      for (const request of requestsTo(fetchMock, 'GET', '/api/v1/debit-orders')) {
        expect(new URL(request.url).searchParams.get('mandateType')).toBe('DebiCheck');
      }
    });

    it('replaces an unknown mandate type in the URL with the default', async () => {
      const { router } = renderApp({
        routes: debitOrderRoutes,
        at: '/debit-orders?mandateType=Everything&status=Rejected',
        api: { [LIST]: paged([]) },
      });

      await waitFor(() => {
        expect(router.state.location.search).toBe('?mandateType=DebiCheck&status=Rejected');
      });
    });

    it('sends filters, sort and page to the API and keeps them in the URL', async () => {
      const { user, fetchMock, router } = renderApp({
        routes: debitOrderRoutes,
        at: '/debit-orders?mandateType=DebiCheck&page=2',
        api: { [LIST]: paged([debitOrder()], { page: 2, totalItems: 25, totalPages: 3 }) },
      });
      await screen.findByRole('list', { name: 'Debit orders' });
      expect(lastQuery(fetchMock)).toMatchObject({ mandateType: 'DebiCheck', page: '2' });

      await user.selectOptions(screen.getByLabelText('Mandate type'), 'Registered');
      await user.selectOptions(screen.getByLabelText('Status'), 'Rejected');
      await user.selectOptions(screen.getByLabelText('Sort by'), '-amount');

      await waitFor(() => {
        expect(lastQuery(fetchMock)).toEqual({
          status: 'Rejected',
          mandateType: 'Registered',
          sort: '-amount',
          page: '1',
          pageSize: '10',
        });
      });
      expect(router.state.location.search).toBe(
        '?mandateType=Registered&status=Rejected&sort=-amount',
      );

      await user.click(screen.getByRole('button', { name: 'Next' }));
      await waitFor(() => {
        expect(lastQuery(fetchMock).page).toBe('3');
      });
    });

    it('offers to show all statuses when nothing matches, keeping the mandate type', async () => {
      const { user, router } = renderApp({
        routes: debitOrderRoutes,
        at: '/debit-orders?mandateType=Registered&status=Rejected',
        api: { [LIST]: paged([]) },
      });

      expect(await screen.findByText('No debit order history')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Show all statuses' }));

      expect(router.state.location.search).toBe('?mandateType=Registered');
    });
  });
});

describe('parseDebitOrderFilters', () => {
  it('ignores unknown values and always yields a mandate type', () => {
    const filters = parseDebitOrderFilters(
      new URLSearchParams('status=Bogus&mandateType=x&sort=name&page=-4'),
    );

    expect(filters).toEqual({
      status: undefined,
      mandateType: 'DebiCheck',
      sort: '-actionDate',
      page: 1,
      pageSize: 10,
    });
  });
});

describe('debit order detail', () => {
  it('shows the details, mandate link and a Dispute button when eligible', async () => {
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
    expect(screen.getByRole('link', { name: 'Dispute' })).toHaveAttribute(
      'href',
      `/debit-orders/${DEBIT_ORDER_ID}/dispute`,
    );
    expect(document.body).not.toHaveTextContent(INELIGIBILITY_TEXT);
  });

  it('puts the mandate type chip before the status chip', async () => {
    renderApp({
      routes: debitOrderRoutes,
      at: `/debit-orders/${DEBIT_ORDER_ID}`,
      api: { [DETAIL]: debitOrder() },
    });
    await screen.findByRole('heading', { level: 1, name: 'FitLife Gym' });

    const chips = [...document.querySelectorAll('[data-tone]')].map((chip) => chip.textContent);
    expect(chips).toEqual(['DebiCheck', 'Accepted']);
  });

  it('shows no Dispute button and no explanation when the order cannot be disputed', async () => {
    renderApp({
      routes: debitOrderRoutes,
      at: `/debit-orders/${DEBIT_ORDER_ID}`,
      api: { [DETAIL]: debitOrder({ ...rejected, id: DEBIT_ORDER_ID }) },
    });

    expect(await screen.findByText('Insufficient funds')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dispute' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Dispute' })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(INELIGIBILITY_TEXT);
  });

  it('shows the status of an existing dispute with a link to it', async () => {
    renderApp({
      routes: debitOrderRoutes,
      at: `/debit-orders/${DEBIT_ORDER_ID}`,
      api: { [DETAIL]: debitOrder({ ...disputed, id: DEBIT_ORDER_ID }) },
    });

    const region = await screen.findByRole('region', { name: 'Dispute' });
    expect(region).toHaveTextContent('ReferenceDSP-2026-000123');
    expect(region).toHaveTextContent('StatusProcessing');
    expect(within(region).getByRole('link', { name: 'View dispute progress' })).toHaveAttribute(
      'href',
      `/disputes/${DISPUTE_ID}`,
    );
    expect(screen.queryByRole('link', { name: 'Dispute' })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(INELIGIBILITY_TEXT);
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
