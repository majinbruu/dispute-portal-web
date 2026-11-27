import { screen, waitFor, within } from '@testing-library/react';
import type { Transaction } from '../../api/types';
import { jsonResponse, paged, problemResponse, requestsTo } from '../../test/apiMock';
import {
  CARD_TRANSACTION_ID,
  cardTransaction,
  debitOrder,
  DISPUTE_ID,
  eftDebitOrder,
  MANDATE_ID,
  TRANSACTION_ID,
} from '../../test/fixtures';
import { renderApp } from '../../test/renderApp';
import { transactionRoutes } from './routes';
import { parseTransactionFilters } from './useTransactionFilters';

const LIST_PATH = '/api/v1/transactions';
const LIST = `GET ${LIST_PATH}`;
const DETAIL = `GET ${LIST_PATH}/${TRANSACTION_ID}`;
const CARD_DETAIL = `GET ${LIST_PATH}/${CARD_TRANSACTION_ID}`;

const rejected = debitOrder(
  {
    id: 'rejected-1',
    counterpartyName: 'SureCover Insurance',
    amount: '1250.50',
    eligibility: {
      canDispute: false,
      code: 'CollectionRejected',
      message: 'This collection was rejected, so no money left your account.',
      lastDisputeDate: '2026-04-09',
    },
  },
  { statementText: 'SURECOVER PREMIUM', status: 'Rejected', statusReason: 'Insufficient funds' },
);

const disputed = debitOrder({
  id: 'disputed-1',
  counterpartyName: 'StreamBox',
  eligibility: {
    canDispute: false,
    code: 'AlreadyDisputed',
    message: 'This debit order has already been disputed.',
    lastDisputeDate: '2026-04-09',
  },
  dispute: { id: DISPUTE_ID, reference: 'DSP-2026-000123', status: 'SentToScheme' },
});

const cashWithdrawal = cardTransaction(
  {
    id: 'cash-1',
    counterpartyName: 'ACME Bank ATM Sandton',
    amount: 500,
    eligibility: {
      canDispute: false,
      code: 'NotAPurchase',
      message: 'Only purchases can be disputed.',
      lastDisputeDate: '2026-07-01',
    },
  },
  { kind: 'CashWithdrawal', merchantCity: 'Sandton', entryMode: 'Chip', verification: 'Pin' },
);

const pendingCard = cardTransaction(
  {
    id: 'pending-1',
    counterpartyName: 'Uber',
    eligibility: {
      canDispute: false,
      code: 'NotSettled',
      message: 'This transaction has not been settled yet.',
      lastDisputeDate: '2026-07-01',
    },
  },
  { status: 'Pending', postingDate: null },
);

/** Wording the customer must never see: why something can or cannot be disputed. */
const INELIGIBILITY_TEXT =
  /cannot be disputed|can be disputed|you can dispute|nothing to dispute|within mandate terms|window closed|last day|was rejected, so|not been settled|only purchases|until \d/i;

/** Answers the list endpoint with the transactions of whichever type was asked for. */
function listByType(debitOrders: Transaction[], cards: Transaction[]) {
  return (request: Request) =>
    jsonResponse(
      paged(new URL(request.url).searchParams.get('type') === 'Card' ? cards : debitOrders),
    );
}

const lastQuery = (fetchMock: ReturnType<typeof renderApp>['fetchMock']) =>
  Object.fromEntries(new URL(requestsTo(fetchMock, 'GET', LIST_PATH).at(-1)!.url).searchParams);

const optionsOf = (label: string) =>
  within(screen.getByLabelText(label))
    .getAllByRole('option')
    .map((option) => option.textContent);

describe('transaction type tabs', () => {
  it('shows Debit orders and Card as tabs, with debit orders selected first', async () => {
    renderApp({
      routes: transactionRoutes,
      at: '/transactions',
      api: { [LIST]: paged([debitOrder()]) },
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Transactions' })).toBeVisible();
    const tablist = screen.getByRole('tablist', { name: 'Transaction type' });
    expect(
      within(tablist)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Debit orders', 'Card']);
    expect(screen.getByRole('tab', { name: 'Debit orders' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Card' })).toHaveAttribute('aria-selected', 'false');

    // The filters and the list belong to the selected tab's panel.
    const panel = screen.getByRole('tabpanel', { name: 'Debit orders' });
    expect(await within(panel).findByRole('list', { name: 'Debit orders' })).toBeInTheDocument();
    expect(within(panel).getByRole('form', { name: 'Filter debit orders' })).toBeInTheDocument();
  });

  it('switches to card transactions, asking the API for that type only', async () => {
    const { user, fetchMock, router } = renderApp({
      routes: transactionRoutes,
      at: '/transactions',
      api: { [LIST]: listByType([debitOrder()], [cardTransaction()]) },
    });
    await screen.findByRole('list', { name: 'Debit orders' });

    await user.click(screen.getByRole('tab', { name: 'Card' }));

    const panel = screen.getByRole('tabpanel', { name: 'Card' });
    expect(
      await within(panel).findByRole('list', { name: 'Card transactions' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Debit orders' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Card' })).toHaveAttribute('aria-selected', 'true');
    expect(router.state.location.search).toBe('?type=Card');
    // No mandate type or debit order status is sent for card transactions: the API rejects them.
    expect(lastQuery(fetchMock)).toEqual({
      type: 'Card',
      sort: '-effectiveDate',
      page: '1',
      pageSize: '10',
    });
  });

  it('can be operated with the keyboard', async () => {
    const { user, router } = renderApp({
      routes: transactionRoutes,
      at: '/transactions',
      api: { [LIST]: listByType([debitOrder()], [cardTransaction()]) },
    });
    await screen.findByRole('list', { name: 'Debit orders' });
    const debitOrdersTab = screen.getByRole('tab', { name: 'Debit orders' });
    const cardTab = screen.getByRole('tab', { name: 'Card' });
    // Only the selected tab is a tab stop; the arrow keys reach the other one.
    expect(debitOrdersTab).toHaveAttribute('tabindex', '0');
    expect(cardTab).toHaveAttribute('tabindex', '-1');

    debitOrdersTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(cardTab).toHaveFocus();
    expect(cardTab).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('list', { name: 'Card transactions' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?type=Card');

    await user.keyboard('{ArrowLeft}');

    expect(debitOrdersTab).toHaveFocus();
    expect(await screen.findByRole('list', { name: 'Debit orders' })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.search).toBe('?mandateType=DebiCheck');
    });
  });

  it('does not carry the filters of one type over to the other', async () => {
    const { user, fetchMock, router } = renderApp({
      routes: transactionRoutes,
      at: '/transactions?mandateType=Registered&status=Rejected&sort=amount&page=2',
      api: { [LIST]: listByType([debitOrder()], [cardTransaction()]) },
    });
    await screen.findByRole('list', { name: 'Debit orders' });

    await user.click(screen.getByRole('tab', { name: 'Card' }));
    await screen.findByRole('list', { name: 'Card transactions' });

    expect(router.state.location.search).toBe('?type=Card');
    expect(lastQuery(fetchMock)).toEqual({
      type: 'Card',
      sort: '-effectiveDate',
      page: '1',
      pageSize: '10',
    });
  });

  it('opens on the card tab from a link to it', async () => {
    renderApp({
      routes: transactionRoutes,
      at: '/transactions?type=Card',
      api: { [LIST]: listByType([debitOrder()], [cardTransaction()]) },
    });

    expect(await screen.findByRole('list', { name: 'Card transactions' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Card' })).toHaveAttribute('aria-selected', 'true');
  });

  it('links the second navigation tab to the dispute history', async () => {
    renderApp({ routes: transactionRoutes, at: '/transactions', api: { [LIST]: paged([]) } });

    const nav = screen.getByRole('navigation', { name: 'Transactions and disputes' });
    expect(within(nav).getByRole('link', { name: 'My transactions' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Dispute history' })).toHaveAttribute(
      'href',
      '/disputes',
    );
    await screen.findByText('No debit order history');
  });
});

describe('debit order list', () => {
  it('lists debit orders with amount, date, mandate type and status', async () => {
    renderApp({
      routes: transactionRoutes,
      at: '/transactions',
      api: { [LIST]: paged([debitOrder(), rejected]) },
    });

    const list = await screen.findByRole('list', { name: 'Debit orders' });
    const [first, second] = within(list).getAllByRole('listitem');

    expect(within(first!).getAllByRole('link')[0]).toHaveAttribute(
      'href',
      `/transactions/${TRANSACTION_ID}`,
    );
    expect(first).toHaveTextContent('FitLife Gym');
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
      routes: transactionRoutes,
      at: '/transactions?mandateType=Registered',
      api: { [LIST]: paged([debitOrder({}, { mandateType: 'Registered' })]) },
    });

    const list = await screen.findByRole('list', { name: 'Debit orders' });
    expect(within(list).getByRole('listitem')).toHaveTextContent(/Registered Mandate\s*Accepted/);
    expect(screen.getByText('1 Registered Mandate debit order')).toBeInTheDocument();
    expect(screen.getByLabelText('Mandate type')).toHaveValue('Registered');
  });

  it('lists EFT debit orders as their own type', async () => {
    const { fetchMock } = renderApp({
      routes: transactionRoutes,
      at: '/transactions?mandateType=Eft',
      api: { [LIST]: paged([eftDebitOrder()]) },
    });

    const list = await screen.findByRole('list', { name: 'Debit orders' });
    const row = within(list).getByRole('listitem');
    expect(row).toHaveTextContent('City of Cape Town');
    expect(row).toHaveTextContent('CITY OF CT RATES');
    expect(row).toHaveTextContent(/EFT\s*Accepted/);
    expect(within(row).getByRole('link', { name: /^Dispute / })).toHaveAttribute(
      'href',
      `/transactions/${TRANSACTION_ID}/dispute`,
    );
    expect(screen.getByText('1 EFT debit order')).toBeInTheDocument();
    expect(screen.getByLabelText('Mandate type')).toHaveValue('Eft');
    expect(lastQuery(fetchMock)).toMatchObject({ type: 'DebitOrder', mandateType: 'Eft' });
  });

  it('offers Dispute only on rows the API says can be disputed', async () => {
    renderApp({
      routes: transactionRoutes,
      at: '/transactions',
      api: { [LIST]: paged([debitOrder(), rejected, disputed]) },
    });

    const list = await screen.findByRole('list', { name: 'Debit orders' });
    const [eligibleRow, rejectedRow, disputedRow] = within(list).getAllByRole('listitem');

    const dispute = within(eligibleRow!).getByRole('link', {
      name: 'Dispute FitLife Gym debit order of 01 Mar 2026',
    });
    expect(dispute).toHaveTextContent(/^Dispute$/);
    expect(dispute).toHaveAttribute('href', `/transactions/${TRANSACTION_ID}/dispute`);
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
      routes: transactionRoutes,
      at: '/transactions',
      api: { [LIST]: paged([debitOrder(), rejected, disputed]) },
    });

    const list = await screen.findByRole('list', { name: 'Debit orders' });
    expect(list).not.toHaveTextContent(INELIGIBILITY_TEXT);
  });

  it('shows the empty state', async () => {
    renderApp({ routes: transactionRoutes, at: '/transactions', api: { [LIST]: paged([]) } });

    expect(await screen.findByText('No debit order history')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show all statuses' })).not.toBeInTheDocument();
  });

  it('shows the API problem with its trace ID and retries', async () => {
    let calls = 0;
    const { user } = renderApp({
      routes: transactionRoutes,
      at: '/transactions',
      api: {
        [LIST]: () => {
          calls += 1;
          return calls === 1
            ? problemResponse(429, 'rate_limited', 'Too many requests. Try again in a minute.')
            : jsonResponse(paged([debitOrder()]));
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
    it('orders the filters mandate type, status, sort', async () => {
      renderApp({ routes: transactionRoutes, at: '/transactions', api: { [LIST]: paged([]) } });
      await screen.findByText('No debit order history');

      const form = screen.getByRole('form', { name: 'Filter debit orders' });
      expect(
        within(form)
          .getAllByRole('combobox')
          .map((select) => select.getAttribute('id'))
          .map((id) => form.querySelector(`label[for="${id}"]`)!.textContent),
      ).toEqual(['Mandate type', 'Status', 'Sort by']);
    });

    it('offers exactly three mandate types with no "all" option, and the two statuses', async () => {
      renderApp({ routes: transactionRoutes, at: '/transactions', api: { [LIST]: paged([]) } });
      await screen.findByText('No debit order history');

      expect(optionsOf('Mandate type')).toEqual(['DebiCheck', 'Registered Mandate', 'EFT']);
      expect(optionsOf('Status')).toEqual(['All statuses', 'Accepted', 'Rejected']);
    });

    it('defaults to DebiCheck, sends it to the API and writes it to the URL', async () => {
      const { fetchMock, router } = renderApp({
        routes: transactionRoutes,
        at: '/transactions',
        api: { [LIST]: paged([debitOrder()]) },
      });
      await screen.findByRole('list', { name: 'Debit orders' });

      expect(screen.getByLabelText('Mandate type')).toHaveValue('DebiCheck');
      expect(lastQuery(fetchMock)).toEqual({
        type: 'DebitOrder',
        mandateType: 'DebiCheck',
        sort: '-effectiveDate',
        page: '1',
        pageSize: '10',
      });
      await waitFor(() => {
        expect(router.state.location.search).toBe('?mandateType=DebiCheck');
      });
      // Every request named a mandate type: the kinds of debit order are never fetched together.
      for (const request of requestsTo(fetchMock, 'GET', LIST_PATH)) {
        expect(new URL(request.url).searchParams.get('mandateType')).toBe('DebiCheck');
      }
    });

    it('replaces an unknown mandate type in the URL with the default', async () => {
      const { router } = renderApp({
        routes: transactionRoutes,
        at: '/transactions?mandateType=Everything&status=Rejected',
        api: { [LIST]: paged([]) },
      });

      await waitFor(() => {
        expect(router.state.location.search).toBe('?mandateType=DebiCheck&status=Rejected');
      });
    });

    it('sends filters, sort and page to the API and keeps them in the URL', async () => {
      const { user, fetchMock, router } = renderApp({
        routes: transactionRoutes,
        at: '/transactions?mandateType=DebiCheck&page=2',
        api: { [LIST]: paged([debitOrder()], { page: 2, totalItems: 25, totalPages: 3 }) },
      });
      await screen.findByRole('list', { name: 'Debit orders' });
      expect(lastQuery(fetchMock)).toMatchObject({ mandateType: 'DebiCheck', page: '2' });

      await user.selectOptions(screen.getByLabelText('Mandate type'), 'Eft');
      await user.selectOptions(screen.getByLabelText('Status'), 'Rejected');
      await user.selectOptions(screen.getByLabelText('Sort by'), '-amount');

      await waitFor(() => {
        expect(lastQuery(fetchMock)).toEqual({
          type: 'DebitOrder',
          mandateType: 'Eft',
          debitOrderStatus: 'Rejected',
          sort: '-amount',
          page: '1',
          pageSize: '10',
        });
      });
      expect(router.state.location.search).toBe('?mandateType=Eft&status=Rejected&sort=-amount');

      await user.click(screen.getByRole('button', { name: 'Next' }));
      await waitFor(() => {
        expect(lastQuery(fetchMock).page).toBe('3');
      });
    });

    it('offers to show all statuses when nothing matches, keeping the mandate type', async () => {
      const { user, router } = renderApp({
        routes: transactionRoutes,
        at: '/transactions?mandateType=Registered&status=Rejected',
        api: { [LIST]: paged([]) },
      });

      expect(await screen.findByText('No debit order history')).toBeInTheDocument();
      expect(
        screen.getByText('No Registered Mandate debit orders have the status you selected.'),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Show all statuses' }));

      expect(router.state.location.search).toBe('?mandateType=Registered');
    });
  });
});

describe('card transaction list', () => {
  const at = '/transactions?type=Card';

  it('lists card transactions with merchant, card, amount, date, kind and status', async () => {
    renderApp({
      routes: transactionRoutes,
      at,
      api: { [LIST]: paged([cardTransaction(), cashWithdrawal]) },
    });

    const list = await screen.findByRole('list', { name: 'Card transactions' });
    const [purchase, withdrawal] = within(list).getAllByRole('listitem');

    expect(within(purchase!).getAllByRole('link')[0]).toHaveAttribute(
      'href',
      `/transactions/${CARD_TRANSACTION_ID}`,
    );
    expect(purchase).toHaveTextContent('Takealot');
    expect(purchase).toHaveTextContent('Visa ************4821 · Cape Town');
    expect(purchase).toHaveTextContent(/R\s1\s899,00/);
    expect(purchase).toHaveTextContent('03 Mar 2026');
    expect(purchase).toHaveTextContent(/Purchase\s*Settled/);

    expect(withdrawal).toHaveTextContent('ACME Bank ATM Sandton');
    expect(withdrawal).toHaveTextContent(/Cash withdrawal\s*Settled/);
    expect(screen.getByText('2 card transactions')).toBeInTheDocument();
    // Card transactions have no mandate, so nothing about mandates is shown.
    expect(list).not.toHaveTextContent(/DebiCheck|Mandate|EFT/);
  });

  it('offers Dispute only on rows the API says can be disputed, with no explanation', async () => {
    renderApp({
      routes: transactionRoutes,
      at,
      api: { [LIST]: paged([cardTransaction(), cashWithdrawal, pendingCard]) },
    });

    const list = await screen.findByRole('list', { name: 'Card transactions' });
    const [purchase, withdrawal, pending] = within(list).getAllByRole('listitem');

    expect(
      within(purchase!).getByRole('link', {
        name: 'Dispute Takealot card transaction of 03 Mar 2026',
      }),
    ).toHaveAttribute('href', `/transactions/${CARD_TRANSACTION_ID}/dispute`);
    expect(within(withdrawal!).getAllByRole('link')).toHaveLength(1);
    expect(within(pending!).getAllByRole('link')).toHaveLength(1);
    expect(pending).toHaveTextContent(/Purchase\s*Pending/);
    expect(list).not.toHaveTextContent(INELIGIBILITY_TEXT);
  });

  it('has a status filter and a sort, and no mandate type filter', async () => {
    renderApp({ routes: transactionRoutes, at, api: { [LIST]: paged([]) } });
    await screen.findByText('No card transactions');

    const form = screen.getByRole('form', { name: 'Filter card transactions' });
    expect(within(form).getAllByRole('combobox')).toHaveLength(2);
    expect(screen.queryByLabelText('Mandate type')).not.toBeInTheDocument();
    expect(optionsOf('Status')).toEqual([
      'All statuses',
      'Settled',
      'Pending',
      'Declined',
      'Reversed',
    ]);
    expect(optionsOf('Sort by')).toEqual([
      'Newest first',
      'Oldest first',
      'Highest amount',
      'Lowest amount',
    ]);
  });

  it('sends the card status, sort and page to the API and keeps them in the URL', async () => {
    const { user, fetchMock, router } = renderApp({
      routes: transactionRoutes,
      at,
      api: { [LIST]: paged([cardTransaction()], { totalItems: 25, totalPages: 3 }) },
    });
    await screen.findByRole('list', { name: 'Card transactions' });

    await user.selectOptions(screen.getByLabelText('Status'), 'Pending');
    await user.selectOptions(screen.getByLabelText('Sort by'), 'amount');

    await waitFor(() => {
      expect(lastQuery(fetchMock)).toEqual({
        type: 'Card',
        cardStatus: 'Pending',
        sort: 'amount',
        page: '1',
        pageSize: '10',
      });
    });
    expect(router.state.location.search).toBe('?type=Card&status=Pending&sort=amount');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(lastQuery(fetchMock).page).toBe('2');
    });
    expect(router.state.location.search).toBe('?type=Card&status=Pending&sort=amount&page=2');
  });

  it('ignores a debit order status and a mandate type in the URL', async () => {
    const { fetchMock } = renderApp({
      routes: transactionRoutes,
      at: '/transactions?type=Card&status=Rejected&mandateType=DebiCheck',
      api: { [LIST]: paged([cardTransaction()]) },
    });
    await screen.findByRole('list', { name: 'Card transactions' });

    expect(screen.getByLabelText('Status')).toHaveValue('');
    expect(lastQuery(fetchMock)).toEqual({
      type: 'Card',
      sort: '-effectiveDate',
      page: '1',
      pageSize: '10',
    });
  });

  it('shows the empty state, and offers all statuses when a status hid everything', async () => {
    const { user, router } = renderApp({
      routes: transactionRoutes,
      at: '/transactions?type=Card&status=Reversed',
      api: { [LIST]: paged([]) },
    });

    expect(await screen.findByText('No card transactions')).toBeInTheDocument();
    expect(
      screen.getByText('No card transactions have the status you selected.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show all statuses' }));

    expect(router.state.location.search).toBe('?type=Card');
    expect(
      await screen.findByText('Purchases and withdrawals made with your card will appear here.'),
    ).toBeInTheDocument();
  });

  it('shows the API problem with its trace ID', async () => {
    renderApp({
      routes: transactionRoutes,
      at,
      api: { [LIST]: () => problemResponse(500, 'internal_error', 'Something broke.') },
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load your card transactions');
    expect(alert).toHaveTextContent('trace-internal_error');
  });
});

describe('parseTransactionFilters', () => {
  it('ignores unknown values and always yields a mandate type for debit orders', () => {
    const filters = parseTransactionFilters(
      new URLSearchParams('type=Cheque&status=Bogus&mandateType=x&sort=name&page=-4'),
    );

    expect(filters).toEqual({
      type: 'DebitOrder',
      status: undefined,
      mandateType: 'DebiCheck',
      sort: '-effectiveDate',
      page: 1,
      pageSize: 10,
    });
  });

  it('reads card filters without a mandate type', () => {
    const filters = parseTransactionFilters(
      new URLSearchParams('type=Card&status=Declined&mandateType=Eft&sort=-amount&page=3'),
    );

    expect(filters).toEqual({
      type: 'Card',
      status: 'Declined',
      sort: '-amount',
      page: 3,
      pageSize: 10,
    });
  });
});

describe('debit order detail', () => {
  it('shows the details, mandate link and a Dispute button when eligible', async () => {
    renderApp({
      routes: transactionRoutes,
      at: `/transactions/${TRANSACTION_ID}`,
      api: { [DETAIL]: debitOrder() },
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'FitLife Gym' })).toBeVisible();
    expect(screen.getByText('Debit order')).toBeInTheDocument();
    expect(screen.getByText('TXN-20260301-0001')).toBeInTheDocument();
    expect(screen.getByText('CTR-7788')).toBeInTheDocument();
    expect(screen.getByText('******4321')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'MND-0001' })).toHaveAttribute(
      'href',
      `/mandates/${MANDATE_ID}`,
    );
    expect(screen.getByRole('link', { name: 'Dispute' })).toHaveAttribute(
      'href',
      `/transactions/${TRANSACTION_ID}/dispute`,
    );
    expect(screen.getByRole('link', { name: /My transactions/ })).toHaveAttribute(
      'href',
      '/transactions',
    );
    expect(document.body).not.toHaveTextContent(INELIGIBILITY_TEXT);
  });

  it('puts the mandate type chip before the status chip', async () => {
    renderApp({
      routes: transactionRoutes,
      at: `/transactions/${TRANSACTION_ID}`,
      api: { [DETAIL]: debitOrder() },
    });
    await screen.findByRole('heading', { level: 1, name: 'FitLife Gym' });

    const chips = [...document.querySelectorAll('[data-tone]')].map((chip) => chip.textContent);
    expect(chips).toEqual(['DebiCheck', 'Accepted']);
  });

  it('shows an EFT debit order without a mandate or a link to one', async () => {
    renderApp({
      routes: transactionRoutes,
      at: `/transactions/${TRANSACTION_ID}`,
      api: { [DETAIL]: eftDebitOrder() },
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'City of Cape Town' }),
    ).toBeVisible();
    const chips = [...document.querySelectorAll('[data-tone]')].map((chip) => chip.textContent);
    expect(chips).toEqual(['EFT', 'Accepted']);
    expect(screen.getByText('CITY OF CT RATES')).toBeInTheDocument();
    // The debit order carries its own contract reference, since there is no mandate to hold it.
    expect(screen.getByText('RATES-55120')).toBeInTheDocument();

    expect(screen.queryByRole('region', { name: 'Mandate' })).not.toBeInTheDocument();
    expect(screen.queryByText('Mandate reference')).not.toBeInTheDocument();
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href')).not.toMatch(/^\/mandates/);
    }
    // It can still be disputed like any other successful debit order.
    expect(screen.getByRole('link', { name: 'Dispute' })).toHaveAttribute(
      'href',
      `/transactions/${TRANSACTION_ID}/dispute`,
    );
  });

  it('shows no Dispute button and no explanation when the order cannot be disputed', async () => {
    renderApp({
      routes: transactionRoutes,
      at: `/transactions/${TRANSACTION_ID}`,
      api: { [DETAIL]: { ...rejected, id: TRANSACTION_ID } },
    });

    expect(await screen.findByText('Insufficient funds')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dispute' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Dispute' })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(INELIGIBILITY_TEXT);
  });

  it('shows the status of an existing dispute with a link to it', async () => {
    renderApp({
      routes: transactionRoutes,
      at: `/transactions/${TRANSACTION_ID}`,
      api: { [DETAIL]: { ...disputed, id: TRANSACTION_ID } },
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
      routes: transactionRoutes,
      at: `/transactions/${TRANSACTION_ID}`,
      api: {
        [DETAIL]: () =>
          problemResponse(404, 'transaction_not_found', 'The transaction was not found.'),
      },
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load this transaction');
    expect(alert).toHaveTextContent('The transaction was not found.');
    expect(alert).toHaveTextContent('trace-transaction_not_found');
    expect(screen.getByRole('link', { name: /My transactions/ })).toHaveAttribute(
      'href',
      '/transactions',
    );
  });
});

describe('card transaction detail', () => {
  const at = `/transactions/${CARD_TRANSACTION_ID}`;

  it('shows the merchant, card, dates and how the card was used in plain language', async () => {
    renderApp({ routes: transactionRoutes, at, api: { [CARD_DETAIL]: cardTransaction() } });

    expect(await screen.findByRole('heading', { level: 1, name: 'Takealot' })).toBeVisible();
    expect(screen.getByText('Card transaction')).toBeInTheDocument();
    const page = document.body;
    expect(page).toHaveTextContent(/R\s1\s899,00/);
    expect(page).toHaveTextContent('MerchantTakealot');
    expect(page).toHaveTextContent('Merchant locationCape Town, South Africa');
    expect(page).toHaveTextContent('CardVisa ************4821');
    expect(page).toHaveTextContent('Transaction date02 Mar 2026');
    expect(page).toHaveTextContent('Posting date03 Mar 2026');
    expect(page).toHaveTextContent('StatusSettled');
    expect(page).toHaveTextContent('How the card was usedOnline');
    expect(page).toHaveTextContent('VerificationNot verified');
    expect(page).toHaveTextContent('Account******4321');
    expect(page).toHaveTextContent('Authorisation codeA1B2C3');
    expect(page).toHaveTextContent('Acquirer reference number74012345678901234567890');
    expect(page).toHaveTextContent('Merchant category code5311');
    // Nothing was refunded, so there is no refund to show.
    expect(screen.queryByText('Refunded')).not.toBeInTheDocument();

    const chips = [...document.querySelectorAll('[data-tone]')].map((chip) => chip.textContent);
    expect(chips).toEqual(['Purchase', 'Settled']);
  });

  it('offers Dispute when eligible, shows no mandate, and goes back to the card tab', async () => {
    renderApp({ routes: transactionRoutes, at, api: { [CARD_DETAIL]: cardTransaction() } });
    await screen.findByRole('heading', { level: 1, name: 'Takealot' });

    expect(screen.getByRole('link', { name: 'Dispute' })).toHaveAttribute(
      'href',
      `/transactions/${CARD_TRANSACTION_ID}/dispute`,
    );
    expect(screen.queryByRole('region', { name: 'Mandate' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /My transactions/ })).toHaveAttribute(
      'href',
      '/transactions?type=Card',
    );
    expect(document.body).not.toHaveTextContent(INELIGIBILITY_TEXT);
  });

  it('labels a chip-and-PIN cash withdrawal and offers no Dispute button', async () => {
    renderApp({
      routes: transactionRoutes,
      at,
      api: { [CARD_DETAIL]: { ...cashWithdrawal, id: CARD_TRANSACTION_ID } },
    });
    await screen.findByRole('heading', { level: 1, name: 'ACME Bank ATM Sandton' });

    const page = document.body;
    expect(page).toHaveTextContent('How the card was usedChip');
    expect(page).toHaveTextContent('VerificationPIN');
    const chips = [...document.querySelectorAll('[data-tone]')].map((chip) => chip.textContent);
    expect(chips).toEqual(['Cash withdrawal', 'Settled']);
    expect(screen.queryByRole('link', { name: 'Dispute' })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(INELIGIBILITY_TEXT);
  });

  it('leaves out the posting date of a pending transaction', async () => {
    renderApp({
      routes: transactionRoutes,
      at,
      api: { [CARD_DETAIL]: { ...pendingCard, id: CARD_TRANSACTION_ID } },
    });
    await screen.findByRole('heading', { level: 1, name: 'Uber' });

    expect(screen.getByText('Transaction date')).toBeInTheDocument();
    expect(screen.queryByText('Posting date')).not.toBeInTheDocument();
    expect(document.body).toHaveTextContent('StatusPending');
    expect(screen.queryByRole('link', { name: 'Dispute' })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(INELIGIBILITY_TEXT);
  });

  it('shows how much of a purchase was refunded, and a 3-D Secure recurring payment', async () => {
    renderApp({
      routes: transactionRoutes,
      at,
      api: {
        [CARD_DETAIL]: cardTransaction(
          { counterpartyName: 'Netflix' },
          {
            scheme: 'Mastercard',
            entryMode: 'Recurring',
            verification: 'ThreeDSecure',
            refundedAmount: '199.00',
          },
        ),
      },
    });
    await screen.findByRole('heading', { level: 1, name: 'Netflix' });

    const page = document.body;
    expect(page).toHaveTextContent(/RefundedR\s199,00/);
    expect(page).toHaveTextContent('CardMastercard ************4821');
    expect(page).toHaveTextContent('How the card was usedRecurring payment');
    expect(page).toHaveTextContent('Verification3-D Secure');
  });

  it('shows the status of an existing dispute with a link to it', async () => {
    renderApp({
      routes: transactionRoutes,
      at,
      api: {
        [CARD_DETAIL]: cardTransaction({
          eligibility: {
            canDispute: false,
            code: 'AlreadyDisputed',
            message: 'This transaction has already been disputed.',
            lastDisputeDate: '2026-07-01',
          },
          dispute: { id: DISPUTE_ID, reference: 'DSP-2026-000456', status: 'Submitted' },
        }),
      },
    });

    const region = await screen.findByRole('region', { name: 'Dispute' });
    expect(region).toHaveTextContent('ReferenceDSP-2026-000456');
    expect(within(region).getByRole('link', { name: 'View dispute progress' })).toHaveAttribute(
      'href',
      `/disputes/${DISPUTE_ID}`,
    );
    expect(screen.queryByRole('link', { name: 'Dispute' })).not.toBeInTheDocument();
  });
});
