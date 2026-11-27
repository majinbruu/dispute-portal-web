import { act, screen, waitFor, within } from '@testing-library/react';
import { PENDING_DISPUTE_POLL_MS } from '../../api/queries';
import { queryKeys } from '../../api/queryKeys';
import { jsonResponse, paged, problemResponse, requestsTo } from '../../test/apiMock';
import {
  CARD_TRANSACTION_ID,
  cardDisputeDetail,
  DISPUTE_ID,
  disputeDetail,
  disputeSummary,
  TRANSACTION_ID,
} from '../../test/fixtures';
import { renderApp } from '../../test/renderApp';
import { disputeRoutes } from './routes';

const LIST = 'GET /api/v1/disputes';
const DETAIL = `GET /api/v1/disputes/${DISPUTE_ID}`;

function listByState(pending: unknown[], completed: unknown[]) {
  return (request: Request) =>
    jsonResponse(
      paged(new URL(request.url).searchParams.get('state') === 'Pending' ? pending : completed),
    );
}

const refunded = disputeDetail({
  status: 'Refunded',
  state: 'Completed',
  completedAt: '2026-03-05T08:15:40Z',
  outcomeNote: 'R 499,00 was paid back into your account.',
  events: [
    {
      status: 'Refunded',
      description: 'The scheme upheld your dispute and you were refunded.',
      actor: 'System',
      occurredAt: '2026-03-05T08:15:40Z',
    },
    {
      status: 'Submitted',
      description: 'We received your dispute.',
      actor: 'Customer',
      occurredAt: '2026-03-05T08:15:00Z',
    },
    {
      status: 'SentToScheme',
      description: 'Your dispute was sent to the payment scheme.',
      actor: 'Agent',
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
          [disputeSummary({ status: 'SentToScheme' })],
          [
            disputeSummary({
              id: 'done-1',
              reference: 'DSP-2026-000099',
              counterpartyName: 'SureCover Insurance',
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
    expect(pending.getByRole('link')).toHaveTextContent(
      'I did not authorise this debit order (MD01)',
    );
    expect(pending.getByRole('link')).toHaveTextContent(/Debit order\s*Processing/);

    const completed = within(await screen.findByRole('list', { name: 'Completed disputes' }));
    expect(completed.getByRole('link')).toHaveTextContent('SureCover Insurance');
    expect(completed.getByRole('link')).toHaveTextContent('Declined');

    const states = requestsTo(fetchMock, 'GET', '/api/v1/disputes').map((request) =>
      new URL(request.url).searchParams.get('state'),
    );
    expect(states.sort()).toEqual(['Completed', 'Pending']);
  });

  it('shows card and debit order disputes together, each marked with its type', async () => {
    renderApp({
      routes: disputeRoutes,
      at: '/disputes',
      api: {
        [LIST]: listByState(
          [
            disputeSummary({
              id: 'card-1',
              reference: 'DSP-2026-000456',
              transactionId: CARD_TRANSACTION_ID,
              transactionType: 'Card',
              counterpartyName: 'Takealot',
              amount: 1899.0,
              reasonId: 'not_received',
              reasonCode: '13.1',
              reasonLabel: 'I did not receive the goods or service',
            }),
            disputeSummary(),
          ],
          [],
        ),
      },
    });

    const [card, debitOrder] = within(
      await screen.findByRole('list', { name: 'Pending disputes' }),
    ).getAllByRole('listitem');
    expect(within(card!).getByRole('link')).toHaveAttribute('href', '/disputes/card-1');
    expect(card).toHaveTextContent('Takealot');
    expect(card).toHaveTextContent(
      'DSP-2026-000456 · I did not receive the goods or service (13.1)',
    );
    expect(card).toHaveTextContent(/R\s1\s899,00/);
    expect(card).toHaveTextContent(/Card transaction\s*Submitted/);
    expect(debitOrder).toHaveTextContent(/Debit order\s*Submitted/);
  });

  it('marks Dispute history as the current tab', async () => {
    renderApp({ routes: disputeRoutes, at: '/disputes', api: { [LIST]: paged([]) } });

    expect(screen.getByRole('heading', { level: 1, name: 'Dispute history' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Dispute history' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'My transactions' })).toHaveAttribute(
      'href',
      '/transactions',
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
          new URL(request.url).searchParams.get('state') === 'Pending'
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
  it('shows two steps with the same status and time as separate steps', async () => {
    const consoleError = vi.spyOn(console, 'error');
    const step = disputeDetail().events[0]!;
    renderApp({
      routes: disputeRoutes,
      at: `/disputes/${DISPUTE_ID}`,
      api: { [DETAIL]: disputeDetail({ events: [step, { ...step }] }) },
    });

    const steps = within(
      await screen.findByRole('list', { name: 'Dispute progress' }),
    ).getAllByRole('listitem');
    expect(steps).toHaveLength(2);
    // React reports two list items with the same key through console.error.
    expect(consoleError).not.toHaveBeenCalled();
  });

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
      'Processing',
      'Refunded',
    ]);
    expect(steps[2]).toHaveAttribute('aria-current', 'step');
    expect(steps[2]).toHaveTextContent('The scheme upheld your dispute and you were refunded.');
    expect(steps[0]).toHaveTextContent('05');
    expect(steps[0]).toHaveTextContent('Mar');

    const details = screen.getByRole('region', { name: 'Dispute details' });
    expect(details).toHaveTextContent('ReferenceDSP-2026-000123');
    expect(details).toHaveTextContent('ReasonI did not authorise this debit order (MD01)');
    expect(details).toHaveTextContent(/AmountR\s499,00/);
    expect(details).toHaveTextContent('OutcomeR 499,00 was paid back into your account.');
    expect(details).toHaveTextContent('Debit orderFitLife Gym, 01 Mar 2026');
    expect(within(details).getByRole('link', { name: /FitLife Gym/ })).toHaveAttribute(
      'href',
      `/transactions/${TRANSACTION_ID}`,
    );
    expect(details).toHaveTextContent('Transaction IDTXN-20260301-0001');
    expect(details).toHaveTextContent('Mandate typeDebiCheck');
    expect(details).toHaveTextContent('Mandate referenceMND-0001');
    expect(details).not.toHaveTextContent('Card scheme');
    expect(screen.queryByText('Checking for updates…')).not.toBeInTheDocument();
  });

  it('shows the card scheme of a card dispute, and no mandate', async () => {
    renderApp({
      routes: disputeRoutes,
      at: `/disputes/${DISPUTE_ID}`,
      api: { [DETAIL]: cardDisputeDetail({ status: 'Refunded', state: 'Completed' }) },
    });

    const details = await screen.findByRole('region', { name: 'Dispute details' });
    expect(details).toHaveTextContent('ReasonI did not receive the goods or service (13.1)');
    expect(details).toHaveTextContent(/AmountR\s1\s899,00/);
    expect(details).toHaveTextContent('Card transactionTakealot, 03 Mar 2026');
    expect(within(details).getByRole('link', { name: /Takealot/ })).toHaveAttribute(
      'href',
      `/transactions/${CARD_TRANSACTION_ID}`,
    );
    expect(details).toHaveTextContent('Acquirer reference number74012345678901234567890');
    expect(details).toHaveTextContent('Card schemeVisa');
    expect(details).not.toHaveTextContent(/Mandate|Transaction ID|Debit order/);
    expect(screen.getByText('Takealot', { selector: 'p' })).toBeInTheDocument();
  });

  it('shows an EFT debit order dispute with its type and no mandate reference', async () => {
    renderApp({
      routes: disputeRoutes,
      at: `/disputes/${DISPUTE_ID}`,
      api: {
        [DETAIL]: disputeDetail({
          counterpartyName: 'City of Cape Town',
          mandateType: 'Eft',
          mandateReference: null,
        }),
      },
    });

    const details = await screen.findByRole('region', { name: 'Dispute details' });
    expect(details).toHaveTextContent('Mandate typeEFT');
    expect(details).not.toHaveTextContent('Mandate reference');
    expect(details).not.toHaveTextContent('Card scheme');
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

      // The outcome changes the lists, the transaction and the inbox.
      expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.disputes.lists });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.transactions.all });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.notifications.all });

      await act(() => vi.advanceTimersByTimeAsync(PENDING_DISPUTE_POLL_MS * 3));
      expect(detailCalls()).toHaveLength(3);
    });
  });
});

describe('withdrawing a dispute', () => {
  const WITHDRAW = `POST /api/v1/disputes/${DISPUTE_ID}/withdraw`;
  const withdrawPath = `/api/v1/disputes/${DISPUTE_ID}/withdraw`;

  const withdrawn = disputeDetail({
    status: 'Withdrawn',
    state: 'Completed',
    completedAt: '2026-03-05T09:00:00Z',
    events: [
      {
        status: 'Submitted',
        description: 'We received your dispute.',
        actor: 'Customer',
        occurredAt: '2026-03-05T08:15:00Z',
      },
      {
        status: 'Withdrawn',
        description: 'You withdrew your dispute.',
        actor: 'Customer',
        occurredAt: '2026-03-05T09:00:00Z',
      },
    ],
  });

  const approved = disputeDetail({
    status: 'SentToScheme',
    events: [
      {
        status: 'Submitted',
        description: 'We received your dispute.',
        actor: 'Customer',
        occurredAt: '2026-03-05T08:15:00Z',
      },
      {
        status: 'SentToScheme',
        description: 'Your dispute was approved and sent for processing.',
        actor: 'Agent',
        occurredAt: '2026-03-05T08:50:00Z',
      },
    ],
  });

  it('says a submitted dispute is waiting for review and offers to withdraw it', async () => {
    renderApp({
      routes: disputeRoutes,
      at: `/disputes/${DISPUTE_ID}`,
      api: { [DETAIL]: disputeDetail() },
    });

    expect(
      await screen.findByText(
        'Your dispute is waiting for review by ACME Bank. You can withdraw it until it has been reviewed.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Withdraw dispute' })).toBeEnabled();
  });

  it.each([
    ['Processing', approved],
    ['Refunded', refunded],
    ['Withdrawn', withdrawn],
  ])('does not offer to withdraw a dispute that is %s', async (label, dispute) => {
    renderApp({
      routes: disputeRoutes,
      at: `/disputes/${DISPUTE_ID}`,
      api: { [DETAIL]: dispute },
    });

    expect(await screen.findByText(label, { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Withdraw dispute' })).not.toBeInTheDocument();
  });

  it('asks for confirmation in the page before anything is sent, and can be cancelled', async () => {
    const confirmDialog = vi.spyOn(window, 'confirm');
    const { user, fetchMock } = renderApp({
      routes: disputeRoutes,
      at: `/disputes/${DISPUTE_ID}`,
      api: { [DETAIL]: disputeDetail(), [WITHDRAW]: withdrawn },
    });

    await user.click(await screen.findByRole('button', { name: 'Withdraw dispute' }));

    const step = screen.getByRole('group', { name: 'Withdraw this dispute?' });
    expect(screen.getByRole('heading', { name: 'Withdraw this dispute?' })).toHaveFocus();
    expect(step).toHaveTextContent('This cannot be undone.');
    expect(confirmDialog).not.toHaveBeenCalled();
    expect(requestsTo(fetchMock, 'POST', withdrawPath)).toHaveLength(0);

    await user.click(within(step).getByRole('button', { name: 'Keep dispute' }));

    expect(screen.queryByRole('group', { name: 'Withdraw this dispute?' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Withdraw dispute' })).toHaveFocus();
    expect(requestsTo(fetchMock, 'POST', withdrawPath)).toHaveLength(0);
  });

  it('withdraws the dispute once confirmed and shows it as withdrawn', async () => {
    const { user, fetchMock, queryClient } = renderApp({
      routes: disputeRoutes,
      at: `/disputes/${DISPUTE_ID}`,
      api: { [DETAIL]: disputeDetail(), [WITHDRAW]: withdrawn },
    });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await user.click(await screen.findByRole('button', { name: 'Withdraw dispute' }));
    await user.click(screen.getByRole('button', { name: 'Yes, withdraw dispute' }));

    const result = await screen.findByText('Your dispute was withdrawn.');
    expect(result).toHaveRole('status');
    expect(result).toHaveFocus();
    expect(screen.getByText('Withdrawn', { selector: 'span' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'You withdrew this dispute before it was reviewed, so nothing was processed.',
      ),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /withdraw/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Checking for updates…')).not.toBeInTheDocument();
    const steps = within(screen.getByRole('list', { name: 'Dispute progress' })).getAllByRole(
      'listitem',
    );
    expect(steps[1]).toHaveTextContent('You withdrew your dispute.');

    const [request] = requestsTo(fetchMock, 'POST', withdrawPath);
    expect(await request!.text()).toBe('');

    // The transaction can be disputed again, and the lists and the inbox have changed.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.disputes.lists });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.transactions.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.notifications.all });
  });

  it('disables both buttons while the withdrawal is being sent', async () => {
    let finish: (response: Response) => void = () => undefined;
    const { user } = renderApp({
      routes: disputeRoutes,
      at: `/disputes/${DISPUTE_ID}`,
      api: {
        [DETAIL]: disputeDetail(),
        [WITHDRAW]: () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      },
    });

    await user.click(await screen.findByRole('button', { name: 'Withdraw dispute' }));
    await user.click(screen.getByRole('button', { name: 'Yes, withdraw dispute' }));

    expect(await screen.findByRole('button', { name: 'Withdrawing…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Keep dispute' })).toBeDisabled();

    finish(jsonResponse(withdrawn));
    expect(await screen.findByText('Your dispute was withdrawn.')).toBeInTheDocument();
  });

  it('explains when an agent reviewed the dispute first, and shows its latest status', async () => {
    let reviewed = false;
    const { user } = renderApp({
      routes: disputeRoutes,
      at: `/disputes/${DISPUTE_ID}`,
      api: {
        [DETAIL]: () => jsonResponse(reviewed ? approved : disputeDetail()),
        [WITHDRAW]: () => {
          reviewed = true;
          return problemResponse(
            409,
            'dispute_not_withdrawable',
            'This dispute can no longer be withdrawn because it has already been reviewed.',
          );
        },
      },
    });

    await user.click(await screen.findByRole('button', { name: 'Withdraw dispute' }));
    await user.click(screen.getByRole('button', { name: 'Yes, withdraw dispute' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Your dispute was not withdrawn');
    expect(alert).toHaveTextContent(
      'It has already been reviewed, so it can no longer be withdrawn. This page now shows its latest status.',
    );
    expect(alert).toHaveTextContent('trace-dispute_not_withdrawable');

    // The page was re-read: it shows the agent's decision and no longer offers to withdraw.
    expect(await screen.findByText('Processing', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Withdraw this dispute?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /withdraw/i })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Your dispute was not withdrawn');
  });

  it('keeps the confirmation step open after any other failure, so it can be tried again', async () => {
    let attempts = 0;
    const { user } = renderApp({
      routes: disputeRoutes,
      at: `/disputes/${DISPUTE_ID}`,
      api: {
        [DETAIL]: disputeDetail(),
        [WITHDRAW]: () => {
          attempts += 1;
          return attempts === 1
            ? problemResponse(500, 'internal_error', 'Something broke on our side.')
            : jsonResponse(withdrawn);
        },
      },
    });

    await user.click(await screen.findByRole('button', { name: 'Withdraw dispute' }));
    await user.click(screen.getByRole('button', { name: 'Yes, withdraw dispute' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Your dispute was not withdrawn');
    expect(alert).toHaveTextContent('Something broke on our side.');

    await user.click(screen.getByRole('button', { name: 'Yes, withdraw dispute' }));

    expect(await screen.findByText('Your dispute was withdrawn.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('dispute comments', () => {
  const COMMENT = `POST /api/v1/disputes/${DISPUTE_ID}/comments`;
  const commentPath = `/api/v1/disputes/${DISPUTE_ID}/comments`;

  const thread = [
    {
      id: 'c-1',
      authorType: 'Customer' as const,
      body: 'I cancelled this membership in January.',
      createdAt: '2026-03-05T08:15:00Z',
    },
    {
      id: 'c-2',
      authorType: 'Agent' as const,
      body: 'Thank you.\nDo you have the cancellation reference?',
      createdAt: '2026-03-05T09:30:00Z',
    },
  ];
  const reply = {
    id: 'c-3',
    authorType: 'Customer' as const,
    body: 'Yes, it is CAN-7781.',
    createdAt: '2026-03-05T10:00:00Z',
  };

  function renderDispute(dispute: unknown, comment?: (request: Request) => Response) {
    return renderApp({
      routes: disputeRoutes,
      at: `/disputes/${DISPUTE_ID}`,
      api: {
        [DETAIL]: dispute as Record<string, unknown>,
        ...(comment ? { [COMMENT]: comment } : {}),
      },
    });
  }

  it('shows the thread oldest first, without naming the agent', async () => {
    renderDispute(disputeDetail({ comments: thread }));

    const items = within(await screen.findByRole('list', { name: 'Comments' })).getAllByRole(
      'listitem',
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('You');
    expect(items[0]).toHaveTextContent('I cancelled this membership in January.');
    expect(within(items[0]!).getByText(/05 Mar 2026/)).toHaveAttribute(
      'datetime',
      '2026-03-05T08:15:00Z',
    );
    expect(items[1]).toHaveTextContent('ACME Bank');
    expect(items[1]).toHaveTextContent('Do you have the cancellation reference?');
  });

  it('invites a first comment while the dispute is open', async () => {
    renderDispute(disputeDetail());

    const comments = await screen.findByRole('region', { name: 'Comments' });
    expect(comments).toHaveTextContent('No comments yet.');
    expect(within(comments).getByRole('textbox', { name: 'Add a comment' })).toHaveValue('');
    expect(within(comments).getByText('1000 of 1000 characters remaining')).toBeInTheDocument();
  });

  it('adds a comment, shows it in the thread and clears the field', async () => {
    const { user, fetchMock } = renderDispute(disputeDetail({ comments: thread }), () =>
      jsonResponse(disputeDetail({ comments: [...thread, reply] })),
    );

    const field = await screen.findByRole('textbox', { name: 'Add a comment' });
    await user.type(field, '  Yes, it is CAN-7781.  ');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    const list = screen.getByRole('list', { name: 'Comments' });
    await waitFor(() => {
      expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    });
    expect(within(list).getAllByRole('listitem')[2]).toHaveTextContent('Yes, it is CAN-7781.');
    expect(field).toHaveValue('');
    expect(screen.getByText('Your comment was added.')).toHaveRole('status');

    const [request] = requestsTo(fetchMock, 'POST', commentPath);
    expect(await request!.json()).toEqual({ body: 'Yes, it is CAN-7781.' });
  });

  it('requires some text and at most 1000 characters', async () => {
    const { user, fetchMock } = renderDispute(disputeDetail());

    const field = await screen.findByRole('textbox', { name: 'Add a comment' });
    await user.type(field, '   ');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a comment');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription(/Enter a comment/);

    await user.clear(field);
    await user.click(field);
    await user.paste('x'.repeat(1001));
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Comment must be 1000 characters or fewer',
    );
    expect(screen.getByText('1 characters over the limit of 1000')).toBeInTheDocument();
    expect(requestsTo(fetchMock, 'POST', commentPath)).toHaveLength(0);
  });

  it('shows the thread of a closed dispute without the form', async () => {
    renderDispute({ ...refunded, comments: thread });

    expect(await screen.findByRole('list', { name: 'Comments' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add comment' })).not.toBeInTheDocument();
  });

  it('has no comments section for a closed dispute that has none', async () => {
    renderDispute(refunded);

    await screen.findByRole('region', { name: 'Dispute details' });
    expect(screen.queryByRole('region', { name: 'Comments' })).not.toBeInTheDocument();
  });

  it('explains when the dispute was closed before the comment was sent, and shows its latest status', async () => {
    let closed = false;
    const { user } = renderApp({
      routes: disputeRoutes,
      at: `/disputes/${DISPUTE_ID}`,
      api: {
        [DETAIL]: () =>
          jsonResponse(
            closed ? { ...refunded, comments: thread } : disputeDetail({ comments: thread }),
          ),
        [COMMENT]: () => {
          closed = true;
          return problemResponse(
            409,
            'dispute_closed',
            'Comments can only be added while a dispute is open.',
          );
        },
      },
    });

    await user.type(await screen.findByRole('textbox', { name: 'Add a comment' }), 'Any news?');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Your comment was not added');
    expect(alert).toHaveTextContent(
      'This dispute was closed before your comment was sent. This page now shows its latest status.',
    );

    // The page was re-read: the dispute is closed, so the form is gone and the thread stays.
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Refunded', { selector: 'span' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Comments' })).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(screen.getByRole('alert')).toHaveTextContent('Your comment was not added');
  });

  it('keeps what was typed when the comment is refused for being sent too often', async () => {
    const { user } = renderDispute(disputeDetail(), () =>
      problemResponse(429, 'rate_limited', 'Too many comments. Wait a moment and try again.'),
    );

    const field = await screen.findByRole('textbox', { name: 'Add a comment' });
    await user.type(field, 'Any news?');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Your comment was not added');
    expect(alert).toHaveTextContent('Too many comments. Wait a moment and try again.');
    expect(field).toHaveValue('Any news?');
    expect(screen.getByRole('button', { name: 'Add comment' })).toBeEnabled();
  });
});
