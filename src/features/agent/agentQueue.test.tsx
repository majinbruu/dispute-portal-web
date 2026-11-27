import { screen, waitFor, within } from '@testing-library/react';
import { jsonResponse, paged, problemResponse, requestsTo } from '../../test/apiMock';
import { agentDisputeSummary, DISPUTE_ID } from '../../test/fixtures';
import { renderApp } from '../../test/renderApp';
import { agentRoutes } from './routes';
import { parseAgentQueueFilters } from './useAgentQueueFilters';

const LIST_PATH = '/api/v1/agent/disputes';
const LIST = `GET ${LIST_PATH}`;

const cardDispute = agentDisputeSummary({
  id: 'card-1',
  reference: 'DSP-2026-000456',
  transactionType: 'Card',
  counterpartyName: 'Takealot',
  amount: 1899.0,
  reasonId: 'not_received',
  reasonCode: '13.1',
  reasonLabel: 'I did not receive the goods or service',
  status: 'SentToScheme',
});

function lastQuery(fetchMock: ReturnType<typeof renderApp>['fetchMock']) {
  return new URL(requestsTo(fetchMock, 'GET', LIST_PATH).at(-1)!.url).searchParams;
}

describe('agent dispute queue', () => {
  it('lists disputes in the order the API returns them, each linking to its review page', async () => {
    const { fetchMock } = renderApp({
      routes: agentRoutes,
      at: '/agent',
      api: { [LIST]: paged([agentDisputeSummary(), cardDispute]) },
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Dispute queue' })).toBeVisible();
    const [first, second] = within(
      await screen.findByRole('list', { name: 'Disputes' }),
    ).getAllByRole('listitem');
    expect(within(first!).getByRole('link')).toHaveAttribute(
      'href',
      `/agent/disputes/${DISPUTE_ID}`,
    );
    expect(first).toHaveTextContent('DSP-2026-000123');
    expect(first).toHaveTextContent('FitLife Gym · I did not authorise this debit order (MD01)');
    expect(first).toHaveTextContent(/R\s499,00/);
    expect(first).toHaveTextContent(/Submitted 05 Mar 2026/);
    expect(first).toHaveTextContent(/Debit order\s*Submitted$/);
    expect(second).toHaveTextContent('Takealot · I did not receive the goods or service (13.1)');
    expect(second).toHaveTextContent(/Card transaction\s*Processing$/);
    expect(screen.getByText('2 disputes')).toBeInTheDocument();

    // No sort is sent: the API's default order is the review queue.
    const query = lastQuery(fetchMock);
    expect(Object.fromEntries(query)).toEqual({ page: '1', pageSize: '10' });
  });

  it('counts a single dispute in the singular', async () => {
    renderApp({ routes: agentRoutes, at: '/agent', api: { [LIST]: paged([cardDispute]) } });

    expect(await screen.findByText('1 dispute')).toBeInTheDocument();
  });

  it('filters by status and by transaction type, keeping both in the URL', async () => {
    const { user, fetchMock, router } = renderApp({
      routes: agentRoutes,
      at: '/agent?page=2',
      api: { [LIST]: paged([agentDisputeSummary()]) },
    });
    await screen.findByRole('list', { name: 'Disputes' });

    const status = screen.getByRole('combobox', { name: 'Status' });
    expect(
      within(status)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['All statuses', 'Submitted', 'Processing', 'Refunded', 'Declined', 'Withdrawn']);
    await user.selectOptions(status, 'Processing');

    await waitFor(() => {
      expect(lastQuery(fetchMock).get('status')).toBe('SentToScheme');
    });
    // Changing a filter starts again from the first page.
    expect(lastQuery(fetchMock).get('page')).toBe('1');
    expect(router.state.location.search).toBe('?status=SentToScheme');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Transaction type' }),
      'Card transaction',
    );

    await waitFor(() => {
      expect(lastQuery(fetchMock).get('transactionType')).toBe('Card');
    });
    expect(lastQuery(fetchMock).get('status')).toBe('SentToScheme');
    expect(router.state.location.search).toBe('?status=SentToScheme&type=Card');

    await user.selectOptions(status, 'All statuses');

    await waitFor(() => {
      expect(lastQuery(fetchMock).has('status')).toBe(false);
    });
    expect(router.state.location.search).toBe('?type=Card');
  });

  it('searches by reference when the search is submitted, not while typing', async () => {
    const { user, fetchMock, router } = renderApp({
      routes: agentRoutes,
      at: '/agent',
      api: { [LIST]: paged([agentDisputeSummary()]) },
    });
    await screen.findByRole('list', { name: 'Disputes' });
    const search = screen.getByRole('search', { name: 'Search disputes by reference' });
    const field = within(search).getByRole('searchbox', { name: 'Dispute reference' });
    expect(field).toHaveAttribute('maxlength', '30');

    await user.type(field, '  000123 ');
    expect(requestsTo(fetchMock, 'GET', LIST_PATH)).toHaveLength(1);

    await user.click(within(search).getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(lastQuery(fetchMock).get('reference')).toBe('000123');
    });
    expect(router.state.location.search).toBe('?reference=000123');
    // The field shows what was searched for, and focus stays where the agent left it.
    expect(field).toHaveValue('000123');
    expect(within(search).getByRole('button', { name: 'Search' })).toHaveFocus();

    await user.clear(field);
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(lastQuery(fetchMock).has('reference')).toBe(false);
    });
  });

  it('reads the filters from the URL', async () => {
    const { fetchMock } = renderApp({
      routes: agentRoutes,
      at: '/agent?status=Declined&type=DebitOrder&reference=DSP-2026&page=3',
      api: { [LIST]: paged([agentDisputeSummary()], { page: 3, totalItems: 30, totalPages: 3 }) },
    });
    await screen.findByRole('list', { name: 'Disputes' });

    expect(Object.fromEntries(lastQuery(fetchMock))).toEqual({
      status: 'Declined',
      transactionType: 'DebitOrder',
      reference: 'DSP-2026',
      page: '3',
      pageSize: '10',
    });
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('Declined');
    expect(screen.getByRole('combobox', { name: 'Transaction type' })).toHaveValue('DebitOrder');
    expect(screen.getByRole('searchbox', { name: 'Dispute reference' })).toHaveValue('DSP-2026');
  });

  it('pages through the queue, keeping the filters', async () => {
    const { user, fetchMock, router } = renderApp({
      routes: agentRoutes,
      at: '/agent?status=Submitted',
      api: {
        [LIST]: (request: Request) => {
          const page = Number(new URL(request.url).searchParams.get('page'));
          return jsonResponse(
            paged([agentDisputeSummary()], { page, totalItems: 25, totalPages: 3 }),
          );
        },
      },
    });
    await screen.findByRole('list', { name: 'Disputes' });
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument();
    expect(lastQuery(fetchMock).get('status')).toBe('Submitted');
    expect(router.state.location.search).toBe('?status=Submitted&page=2');

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=Submitted');
  });

  it('says when no dispute matches the filters and offers to clear them', async () => {
    const { user, fetchMock } = renderApp({
      routes: agentRoutes,
      at: '/agent?status=Withdrawn&reference=nothing',
      api: {
        [LIST]: (request: Request) =>
          jsonResponse(
            paged(new URL(request.url).searchParams.has('status') ? [] : [agentDisputeSummary()]),
          ),
      },
    });

    expect(await screen.findByText('No disputes match your filters')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByRole('list', { name: 'Disputes' })).toBeInTheDocument();
    expect(Object.fromEntries(lastQuery(fetchMock))).toEqual({ page: '1', pageSize: '10' });
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('');
    expect(screen.getByRole('searchbox', { name: 'Dispute reference' })).toHaveValue('');
  });

  it('shows an empty queue without a way to clear filters that are not set', async () => {
    renderApp({ routes: agentRoutes, at: '/agent', api: { [LIST]: paged([]) } });

    expect(await screen.findByText('No disputes yet')).toBeInTheDocument();
    expect(
      screen.getByText('Disputes raised by customers will appear here for review.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('shows an API problem with its trace ID and retries', async () => {
    let attempts = 0;
    const { user } = renderApp({
      routes: agentRoutes,
      at: '/agent',
      api: {
        [LIST]: () => {
          attempts += 1;
          return attempts === 1
            ? problemResponse(403, 'forbidden', 'You do not have access to this information.')
            : jsonResponse(paged([agentDisputeSummary()]));
        },
      },
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load the disputes');
    expect(alert).toHaveTextContent('trace-forbidden');

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('list', { name: 'Disputes' })).toBeInTheDocument();
  });
});

describe('parseAgentQueueFilters', () => {
  it('ignores values that are not known and falls back to the first page', () => {
    expect(
      parseAgentQueueFilters(new URLSearchParams('status=Lost&type=Cheque&page=0&reference=%20')),
    ).toEqual({
      status: undefined,
      transactionType: undefined,
      reference: undefined,
      page: 1,
      pageSize: 10,
    });
  });

  it('trims the reference and cuts it to the length the API accepts', () => {
    const filters = parseAgentQueueFilters(
      new URLSearchParams({ reference: ` ${'A'.repeat(40)} `, page: '2' }),
    );

    expect(filters.reference).toBe('A'.repeat(30));
    expect(filters.page).toBe(2);
  });
});
