import { act, screen, waitFor, within } from '@testing-library/react';
import { PENDING_DISPUTE_POLL_MS } from '../../api/queries';
import { queryKeys } from '../../api/queryKeys';
import { jsonResponse, paged, problemResponse, requestsTo } from '../../test/apiMock';
import { DEBIT_ORDER_ID, DISPUTE_ID, disputeDetail, disputeSummary } from '../../test/fixtures';
import { renderApp } from '../../test/renderApp';
import { disputeRoutes } from './routes';

const LIST = 'GET /api/v1/disputes';
const DETAIL = `GET /api/v1/disputes/${DISPUTE_ID}`;

function listByState(pending: unknown[], completed: unknown[]) {
  return (request: Request) =>
    jsonResponse(
      paged(new URL(request.url).searchParams.get('State') === 'Pending' ? pending : completed),
    );
}

const refunded = disputeDetail({
  status: 'Refunded',
  state: 'Completed',
  completedAt: '2026-03-05T08:15:40Z',
  outcomeNote: 'R 499,00 was paid back into your account.',
  comment: 'Never signed up.',
  events: [
    {
      status: 'Refunded',
      description: 'The scheme upheld your dispute and you were refunded.',
      occurredAt: '2026-03-05T08:15:40Z',
    },
    {
      status: 'Submitted',
      description: 'We received your dispute.',
      occurredAt: '2026-03-05T08:15:00Z',
    },
    {
      status: 'SentToScheme',
      description: 'Your dispute was sent to the payment scheme.',
      occurredAt: '2026-03-05T08:15:10Z',
    },
  ],
});

describe('dispute history', () => {
  it('shows pending and completed disputes in separate sections', async () => {
    const { fetchMock } = renderApp({
      routes: disputeRoutes,
      at: '/disputes',
      api: {
        [LIST]: listByState(
          [disputeSummary()],
          [
            disputeSummary({
              id: 'done-1',
              reference: 'DSP-2026-000099',
              creditorName: 'SureCover Insurance',
              status: 'Declined',
              state: 'Completed',
              completedAt: '2026-02-01T10:00:00Z',
            }),
          ],
        ),
      },
    });

    const pending = within(await screen.findByRole('list', { name: 'Pending disputes' }));
    expect(pending.getByRole('link')).toHaveAttribute('href', `/disputes/${DISPUTE_ID}`);
    expect(pending.getByRole('link')).toHaveTextContent('FitLife Gym');
    expect(pending.getByRole('link')).toHaveTextContent('DSP-2026-000123');
    expect(pending.getByRole('link')).toHaveTextContent('Submitted');

    const completed = within(await screen.findByRole('list', { name: 'Completed disputes' }));
    expect(completed.getByRole('link')).toHaveTextContent('SureCover Insurance');
    expect(completed.getByRole('link')).toHaveTextContent('Declined');

    const states = requestsTo(fetchMock, 'GET', '/api/v1/disputes').map((request) =>
      new URL(request.url).searchParams.get('State'),
    );
    expect(states.sort()).toEqual(['Completed', 'Pending']);
  });

  it('marks Dispute history as the current tab', async () => {
    renderApp({ routes: disputeRoutes, at: '/disputes', api: { [LIST]: paged([]) } });

    expect(screen.getByRole('heading', { level: 1, name: 'Dispute history' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Dispute history' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'My debit orders' })).toHaveAttribute(
      'href',
      '/debit-orders',
    );
    await screen.findByText('No pending disputes');
  });

  it('shows an empty state per section', async () => {
    renderApp({ routes: disputeRoutes, at: '/disputes', api: { [LIST]: paged([]) } });

    const pending = screen.getByRole('region', { name: 'Pending' });
    const completed = screen.getByRole('region', { name: 'Completed' });
    expect(await within(pending).findByText('No pending disputes')).toBeInTheDocument();
    expect(await within(completed).findByText('No completed disputes')).toBeInTheDocument();
  });

  it('shows an API problem with its trace ID in the section that failed', async () => {
    renderApp({
      routes: disputeRoutes,
      at: '/disputes',
      api: {
        [LIST]: (request: Request) =>
          new URL(request.url).searchParams.get('State') === 'Pending'
            ? problemResponse(500, 'internal_error', 'Something broke on our side.')
            : jsonResponse(paged([])),
      },
    });

    const alert = await within(screen.getByRole('region', { name: 'Pending' })).findByRole('alert');
    expect(alert).toHaveTextContent('We could not load your pending disputes');
    expect(alert).toHaveTextContent('trace-internal_error');
    expect(await screen.findByText('No completed disputes')).toBeInTheDocument();
  });
});

describe('dispute progress', () => {
  it('shows the timeline in chronological order with the dispute details', async () => {
    renderApp({
      routes: disputeRoutes,
      at: `/disputes/${DISPUTE_ID}`,
      api: { [DETAIL]: refunded },
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dispute progress' }),
    ).toBeVisible();
    const steps = within(
      await screen.findByRole('list', { name: 'Dispute progress' }),
    ).getAllByRole('listitem');
    expect(steps.map((step) => within(step).getAllByRole('paragraph')[0]!.textContent)).toEqual([
      'Submitted',
      'Sent to scheme',
      'Refunded',
    ]);
    expect(steps[2]).toHaveAttribute('aria-current', 'step');
    expect(steps[2]).toHaveTextContent('The scheme upheld your dispute and you were refunded.');
    expect(steps[0]).toHaveTextContent('05');
    expect(steps[0]).toHaveTextContent('Mar');

    const details = screen.getByRole('region', { name: 'Dispute details' });
    expect(details).toHaveTextContent('ReferenceDSP-2026-000123');
    expect(details).toHaveTextContent('ReasonI did not authorise this debit order');
    expect(details).toHaveTextContent('CommentNever signed up.');
    expect(details).toHaveTextContent(/AmountR\s499,00/);
    expect(details).toHaveTextContent('OutcomeR 499,00 was paid back into your account.');
    expect(within(details).getByRole('link', { name: /FitLife Gym/ })).toHaveAttribute(
      'href',
      `/debit-orders/${DEBIT_ORDER_ID}`,
    );
    expect(screen.queryByText('Checking for updates…')).not.toBeInTheDocument();
  });

  it('shows a not-found problem with its trace ID', async () => {
    renderApp({
      routes: disputeRoutes,
      at: `/disputes/${DISPUTE_ID}`,
      api: { [DETAIL]: () => problemResponse(404, 'not_found', 'Dispute not found.') },
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Dispute not found.');
    expect(alert).toHaveTextContent('trace-not_found');
  });

  describe('while pending', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('refetches every 3 seconds until the dispute is completed, then stops', async () => {
      let calls = 0;
      const { fetchMock, queryClient } = renderApp({
        routes: disputeRoutes,
        at: `/disputes/${DISPUTE_ID}`,
        api: {
          [DETAIL]: () => {
            calls += 1;
            return jsonResponse(calls < 3 ? disputeDetail() : refunded);
          },
        },
      });
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
      const detailCalls = () => requestsTo(fetchMock, 'GET', `/api/v1/disputes/${DISPUTE_ID}`);

      expect(await screen.findByText('Checking for updates…')).toBeInTheDocument();
      expect(detailCalls()).toHaveLength(1);
      expect(PENDING_DISPUTE_POLL_MS).toBe(3000);

      await act(() => vi.advanceTimersByTimeAsync(PENDING_DISPUTE_POLL_MS));
      await waitFor(() => {
        expect(detailCalls()).toHaveLength(2);
      });
      expect(invalidate).not.toHaveBeenCalled();

      await act(() => vi.advanceTimersByTimeAsync(PENDING_DISPUTE_POLL_MS));
      expect(await screen.findByText('Refunded', { selector: 'span' })).toBeInTheDocument();
      expect(screen.queryByText('Checking for updates…')).not.toBeInTheDocument();

      // The outcome changes the lists, the debit order and the inbox.
      expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.disputes.lists });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.debitOrders.all });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.notifications.all });

      await act(() => vi.advanceTimersByTimeAsync(PENDING_DISPUTE_POLL_MS * 3));
      expect(detailCalls()).toHaveLength(3);
    });
  });
});
