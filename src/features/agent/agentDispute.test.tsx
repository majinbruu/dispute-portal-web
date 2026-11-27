import { screen, waitFor, within } from '@testing-library/react';
import type { AgentDisputeDetail } from '../../api/types';
import { queryKeys } from '../../api/queryKeys';
import { jsonResponse, problemResponse, requestsTo } from '../../test/apiMock';
import {
  AGENT_ID,
  agentDisputeDetail,
  CARD_TRANSACTION_ID,
  CUSTOMER_ID,
  DISPUTE_ID,
} from '../../test/fixtures';
import { renderApp } from '../../test/renderApp';
import { agentRoutes } from './routes';

const BASE = `/api/v1/agent/disputes/${DISPUTE_ID}`;
const DETAIL = `GET ${BASE}`;
const APPROVE = `POST ${BASE}/approve`;
const REJECT = `POST ${BASE}/reject`;
const COMMENT = `POST ${BASE}/comments`;

const submittedEvent = agentDisputeDetail().events[0]!;

const customerComment = {
  id: 'c-1',
  authorType: 'Customer' as const,
  authorSubjectId: CUSTOMER_ID,
  body: 'I cancelled this membership in January.',
  createdAt: '2026-03-05T08:15:00Z',
};
const agentComment = {
  id: 'c-2',
  authorType: 'Agent' as const,
  authorSubjectId: AGENT_ID,
  body: 'Do you have the cancellation reference?',
  createdAt: '2026-03-05T09:30:00Z',
};

const approved = agentDisputeDetail({
  status: 'SentToScheme',
  sentToSchemeAt: '2026-03-05T08:50:00Z',
  events: [
    submittedEvent,
    {
      status: 'SentToScheme',
      description: 'An agent approved the dispute and it was sent for processing.',
      actor: 'Agent',
      actorSubjectId: AGENT_ID,
      occurredAt: '2026-03-05T08:50:00Z',
    },
  ],
});

const rejected = agentDisputeDetail({
  status: 'Declined',
  completedAt: '2026-03-05T08:50:00Z',
  outcomeNote: 'The mandate was signed on 12 January.',
  events: [
    submittedEvent,
    {
      status: 'Declined',
      description: 'An agent rejected the dispute.',
      actor: 'Agent',
      actorSubjectId: AGENT_ID,
      occurredAt: '2026-03-05T08:50:00Z',
    },
  ],
});

const withdrawn = agentDisputeDetail({
  status: 'Withdrawn',
  completedAt: '2026-03-05T08:40:00Z',
  events: [
    submittedEvent,
    {
      status: 'Withdrawn',
      description: 'The customer withdrew the dispute.',
      actor: 'Customer',
      actorSubjectId: CUSTOMER_ID,
      occurredAt: '2026-03-05T08:40:00Z',
    },
  ],
});

const refunded = agentDisputeDetail({
  ...approved,
  status: 'Refunded',
  completedAt: '2026-03-05T08:51:00Z',
  outcomeNote: 'R 499,00 was paid back into the account.',
  events: [
    ...approved.events,
    {
      status: 'Refunded',
      description: 'The scheme upheld the dispute.',
      actor: 'System',
      actorSubjectId: null,
      occurredAt: '2026-03-05T08:51:00Z',
    },
  ],
});

type Handler = (request: Request) => Response | Promise<Response>;

function renderDispute(
  dispute: AgentDisputeDetail | Handler = agentDisputeDetail(),
  actions: Record<string, Handler> = {},
) {
  return renderApp({
    routes: agentRoutes,
    at: `/agent/disputes/${DISPUTE_ID}`,
    api: {
      [DETAIL]: typeof dispute === 'function' ? dispute : () => jsonResponse(dispute),
      ...actions,
    },
  });
}

describe('agent dispute page', () => {
  it('shows the dispute, the disputed transaction and a way back to the queue', async () => {
    renderDispute();

    expect(await screen.findByRole('heading', { level: 1, name: 'DSP-2026-000123' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Dispute queue/ })).toHaveAttribute('href', '/agent');

    const details = screen.getByRole('region', { name: 'Dispute details' });
    expect(details).toHaveTextContent('ReasonI did not authorise this debit order (MD01)');
    expect(details).toHaveTextContent(`Customer ID${CUSTOMER_ID}`);
    expect(details).toHaveTextContent(/Submitted05 Mar 2026/);
    expect(details).not.toHaveTextContent(/Sent for processing|Completed|Outcome/);

    const transaction = screen.getByRole('region', { name: 'Transaction' });
    expect(transaction).toHaveTextContent('TypeDebit order');
    expect(transaction).toHaveTextContent('CompanyFitLife Gym');
    expect(transaction).toHaveTextContent(/AmountR\s499,00/);
    expect(transaction).toHaveTextContent('Transaction date01 Mar 2026');
    expect(transaction).toHaveTextContent('Account******4321');
    expect(transaction).toHaveTextContent('Transaction IDTXN-20260301-0001');
    expect(transaction).toHaveTextContent('Mandate typeDebiCheck');
    expect(transaction).toHaveTextContent('Mandate referenceMND-0001');
    expect(transaction).not.toHaveTextContent(/Card scheme|Posting date|Merchant/);
    // An agent has no customer pages to go to.
    expect(within(transaction).queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows a card dispute with its card details and no mandate', async () => {
    renderDispute(
      agentDisputeDetail({
        transaction: {
          id: CARD_TRANSACTION_ID,
          type: 'Card',
          schemeReference: '74012345678901234567890',
          counterpartyName: 'Takealot',
          amount: 1899.0,
          currency: 'ZAR',
          transactionDate: '2026-03-02',
          postingDate: '2026-03-03',
          accountMasked: '******4321',
          mandateType: null,
          mandateReference: null,
          cardScheme: 'Visa',
        },
        reasonCode: '13.1',
        reasonLabel: 'I did not receive the goods or service',
      }),
    );

    const transaction = await screen.findByRole('region', { name: 'Transaction' });
    expect(transaction).toHaveTextContent('TypeCard transaction');
    expect(transaction).toHaveTextContent('MerchantTakealot');
    expect(transaction).toHaveTextContent('Posting date03 Mar 2026');
    expect(transaction).toHaveTextContent('Acquirer reference number74012345678901234567890');
    expect(transaction).toHaveTextContent('Card schemeVisa');
    expect(transaction).not.toHaveTextContent(/Mandate|Transaction ID|Company/);
  });

  it('shows who did what in the audit trail, oldest first', async () => {
    renderDispute({ ...refunded, events: [...refunded.events].reverse() });

    const steps = within(await screen.findByRole('list', { name: 'Audit trail' })).getAllByRole(
      'listitem',
    );
    expect(steps.map((step) => within(step).getAllByRole('paragraph')[0]!.textContent)).toEqual([
      'Submitted',
      'Processing',
      'Refunded',
    ]);
    expect(steps[0]).toHaveTextContent(`Customer ${CUSTOMER_ID} · `);
    expect(steps[1]).toHaveTextContent(`Agent ${AGENT_ID} · `);
    expect(steps[1]).toHaveTextContent(
      'An agent approved the dispute and it was sent for processing.',
    );
    expect(steps[2]).toHaveTextContent('System · ');
    expect(steps[2]).toHaveAttribute('aria-current', 'step');

    const details = screen.getByRole('region', { name: 'Dispute details' });
    expect(details).toHaveTextContent(/Sent for processing05 Mar 2026/);
    expect(details).toHaveTextContent(/Completed05 Mar 2026/);
    expect(details).toHaveTextContent('OutcomeR 499,00 was paid back into the account.');
  });

  it('shows two steps with the same status and time as separate steps', async () => {
    const consoleError = vi.spyOn(console, 'error');
    renderDispute(agentDisputeDetail({ events: [submittedEvent, { ...submittedEvent }] }));

    const steps = within(await screen.findByRole('list', { name: 'Audit trail' })).getAllByRole(
      'listitem',
    );
    expect(steps).toHaveLength(2);
    // React reports two list items with the same key through console.error.
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows a not-found problem with its trace ID', async () => {
    renderDispute(() => problemResponse(404, 'dispute_not_found', 'The dispute was not found.'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load this dispute');
    expect(alert).toHaveTextContent('The dispute was not found.');
    expect(alert).toHaveTextContent('trace-dispute_not_found');
    expect(screen.getByRole('link', { name: /Dispute queue/ })).toHaveAttribute('href', '/agent');
  });
});

describe('agent review', () => {
  it('offers Approve and Reject only while the dispute waits for review', async () => {
    renderDispute();

    expect(await screen.findByRole('button', { name: 'Approve' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
  });

  it.each([
    ['Processing', approved],
    ['Refunded', refunded],
    ['Declined', rejected],
    ['Withdrawn', withdrawn],
  ])('offers no decision on a dispute that is %s', async (label, dispute) => {
    renderDispute(dispute);

    expect(await screen.findByText(label, { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('asks for confirmation before approving, and can be cancelled', async () => {
    const confirmDialog = vi.spyOn(window, 'confirm');
    const { user, fetchMock } = renderDispute(agentDisputeDetail(), {
      [APPROVE]: () => jsonResponse(approved),
    });

    await user.click(await screen.findByRole('button', { name: 'Approve' }));

    const step = screen.getByRole('group', { name: 'Approve this dispute?' });
    expect(screen.getByRole('heading', { name: 'Approve this dispute?' })).toHaveFocus();
    expect(step).toHaveTextContent(
      'The dispute will be sent for processing. This cannot be undone.',
    );
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(confirmDialog).not.toHaveBeenCalled();
    expect(requestsTo(fetchMock, 'POST', `${BASE}/approve`)).toHaveLength(0);

    await user.click(within(step).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('group', { name: 'Approve this dispute?' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toHaveFocus();
    expect(requestsTo(fetchMock, 'POST', `${BASE}/approve`)).toHaveLength(0);
  });

  it('approves the dispute once confirmed and shows it as processing', async () => {
    const { user, fetchMock, queryClient } = renderDispute(agentDisputeDetail(), {
      [APPROVE]: () => jsonResponse(approved),
    });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await user.click(await screen.findByRole('button', { name: 'Approve' }));
    await user.click(screen.getByRole('button', { name: 'Yes, approve dispute' }));

    const result = await screen.findByText('Dispute approved. It has been sent for processing.');
    expect(result).toHaveRole('status');
    expect(result).toHaveFocus();
    expect(screen.getByText('Processing', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve|reject/i })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Audit trail' })).toHaveTextContent(
      `Agent ${AGENT_ID}`,
    );

    const [request] = requestsTo(fetchMock, 'POST', `${BASE}/approve`);
    expect(await request!.text()).toBe('');
    // The queue has changed too.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.agentDisputes.lists });
  });

  it('disables the buttons while the decision is being sent', async () => {
    let finish: (response: Response) => void = () => undefined;
    const { user } = renderDispute(agentDisputeDetail(), {
      [APPROVE]: () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    });

    await user.click(await screen.findByRole('button', { name: 'Approve' }));
    await user.click(screen.getByRole('button', { name: 'Yes, approve dispute' }));

    expect(await screen.findByRole('button', { name: 'Approving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    finish(jsonResponse(approved));
    expect(await screen.findByText(/Dispute approved/)).toBeInTheDocument();
  });

  it('requires a reason of at most 500 characters before rejecting', async () => {
    const { user, fetchMock } = renderDispute(agentDisputeDetail(), {
      [REJECT]: () => jsonResponse(rejected),
    });

    await user.click(await screen.findByRole('button', { name: 'Reject' }));

    const step = screen.getByRole('group', { name: 'Reject this dispute?' });
    expect(screen.getByRole('heading', { name: 'Reject this dispute?' })).toHaveFocus();
    expect(step).toHaveTextContent('the customer will see your reason as the outcome');
    const reason = within(step).getByRole('textbox', { name: 'Reason for rejecting' });
    expect(reason).toBeRequired();
    expect(within(step).getByText('500 of 500 characters remaining')).toBeInTheDocument();

    await user.type(reason, '   ');
    await user.click(within(step).getByRole('button', { name: 'Reject dispute' }));

    expect(await within(step).findByRole('alert')).toHaveTextContent(
      'Enter the reason for rejecting this dispute',
    );
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    expect(reason).toHaveAccessibleDescription(/Enter the reason for rejecting this dispute/);

    await user.clear(reason);
    await user.click(reason);
    await user.paste('x'.repeat(501));
    await user.click(within(step).getByRole('button', { name: 'Reject dispute' }));

    expect(await within(step).findByRole('alert')).toHaveTextContent(
      'Reason must be 500 characters or fewer',
    );
    expect(within(step).getByText('1 characters over the limit of 500')).toBeInTheDocument();
    expect(requestsTo(fetchMock, 'POST', `${BASE}/reject`)).toHaveLength(0);
  });

  it('can cancel a rejection, returning focus to the Reject button', async () => {
    const { user, fetchMock } = renderDispute(agentDisputeDetail(), {
      [REJECT]: () => jsonResponse(rejected),
    });

    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    await user.type(screen.getByRole('textbox', { name: 'Reason for rejecting' }), 'Not sure yet');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Reject' })).toHaveFocus();
    expect(requestsTo(fetchMock, 'POST', `${BASE}/reject`)).toHaveLength(0);
  });

  it('rejects the dispute with the trimmed reason and shows it as declined', async () => {
    const { user, fetchMock } = renderDispute(agentDisputeDetail(), {
      [REJECT]: () => jsonResponse(rejected),
    });

    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Reason for rejecting' }),
      '  The mandate was signed on 12 January.  ',
    );
    await user.click(screen.getByRole('button', { name: 'Reject dispute' }));

    const result = await screen.findByText(
      'Dispute rejected. The customer will see your reason as the outcome.',
    );
    expect(result).toHaveRole('status');
    expect(result).toHaveFocus();
    expect(screen.getByText('Declined', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Dispute details' })).toHaveTextContent(
      'OutcomeThe mandate was signed on 12 January.',
    );
    expect(screen.queryByRole('button', { name: /approve|reject/i })).not.toBeInTheDocument();

    const [request] = requestsTo(fetchMock, 'POST', `${BASE}/reject`);
    expect(await request!.json()).toEqual({ reason: 'The mandate was signed on 12 January.' });
  });

  it.each([
    ['approving', 'Approve', 'Yes, approve dispute', APPROVE, 'This dispute was not approved'],
    ['rejecting', 'Reject', 'Reject dispute', REJECT, 'This dispute was not rejected'],
  ])(
    'explains when the customer withdrew the dispute before %s, and shows its latest status',
    async (_action, open, confirm, route, title) => {
      let changed = false;
      const { user } = renderDispute(
        () => jsonResponse(changed ? withdrawn : agentDisputeDetail()),
        {
          [route]: () => {
            changed = true;
            return problemResponse(
              409,
              'dispute_not_awaiting_review',
              'This dispute is no longer waiting for review.',
            );
          },
        },
      );

      await user.click(await screen.findByRole('button', { name: open }));
      const reason = screen.queryByRole('textbox', { name: 'Reason for rejecting' });
      if (reason) await user.type(reason, 'Within mandate terms.');
      await user.click(screen.getByRole('button', { name: confirm }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(title);
      expect(alert).toHaveTextContent(
        'It was already approved, rejected or withdrawn. This page now shows its latest status.',
      );
      expect(alert).toHaveTextContent('trace-dispute_not_awaiting_review');

      // The page was re-read: it shows the withdrawal and offers no decision any more.
      expect(await screen.findByText('Withdrawn', { selector: 'span' })).toBeInTheDocument();
      expect(screen.queryByRole('group')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /approve|reject/i })).not.toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(title);
    },
  );

  it('keeps the rejection open with its reason after any other failure, so it can be sent again', async () => {
    let attempts = 0;
    const { user } = renderDispute(agentDisputeDetail(), {
      [REJECT]: () => {
        attempts += 1;
        return attempts === 1
          ? problemResponse(500, 'internal_error', 'Something broke on our side.')
          : jsonResponse(rejected);
      },
    });

    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    await user.type(screen.getByRole('textbox', { name: 'Reason for rejecting' }), 'Signed.');
    await user.click(screen.getByRole('button', { name: 'Reject dispute' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This dispute was not rejected');
    expect(alert).toHaveTextContent('Something broke on our side.');
    expect(screen.getByRole('textbox', { name: 'Reason for rejecting' })).toHaveValue('Signed.');

    await user.click(screen.getByRole('button', { name: 'Reject dispute' }));

    expect(await screen.findByText(/Dispute rejected/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows only the failure of the decision that was tried last', async () => {
    const { user } = renderDispute(agentDisputeDetail(), {
      [APPROVE]: () => problemResponse(500, 'internal_error', 'Approve failed.'),
      [REJECT]: () => problemResponse(500, 'internal_error', 'Reject failed.'),
    });

    await user.click(await screen.findByRole('button', { name: 'Approve' }));
    await user.click(screen.getByRole('button', { name: 'Yes, approve dispute' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This dispute was not approved');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    await user.type(screen.getByRole('textbox', { name: 'Reason for rejecting' }), 'Signed.');
    await user.click(screen.getByRole('button', { name: 'Reject dispute' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('This dispute was not rejected');
    });
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
});

describe('agent comments', () => {
  it('shows the thread with who wrote each comment', async () => {
    renderDispute(agentDisputeDetail({ comments: [customerComment, agentComment] }));

    const items = within(await screen.findByRole('list', { name: 'Comments' })).getAllByRole(
      'listitem',
    );
    expect(items[0]).toHaveTextContent(`Customer${CUSTOMER_ID}`);
    expect(items[0]).toHaveTextContent('I cancelled this membership in January.');
    expect(items[1]).toHaveTextContent(`Agent${AGENT_ID}`);
    expect(items[1]).toHaveTextContent('Do you have the cancellation reference?');
  });

  it('adds a comment while the dispute is open', async () => {
    const { user, fetchMock } = renderDispute(approved, {
      [COMMENT]: () => jsonResponse({ ...approved, comments: [customerComment, agentComment] }),
    });

    const field = await screen.findByRole('textbox', { name: 'Add a comment' });
    await user.type(field, ' Do you have the cancellation reference? ');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    const list = await screen.findByRole('list', { name: 'Comments' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(field).toHaveValue('');
    expect(screen.getByText('Your comment was added.')).toHaveRole('status');

    const [request] = requestsTo(fetchMock, 'POST', `${BASE}/comments`);
    expect(await request!.json()).toEqual({ body: 'Do you have the cancellation reference?' });
  });

  it('requires some text before a comment is sent', async () => {
    const { user, fetchMock } = renderDispute();

    await user.click(await screen.findByRole('button', { name: 'Add comment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a comment');
    expect(requestsTo(fetchMock, 'POST', `${BASE}/comments`)).toHaveLength(0);
  });

  it('shows the thread of a closed dispute without the form', async () => {
    renderDispute({ ...rejected, comments: [customerComment] });

    expect(await screen.findByRole('list', { name: 'Comments' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('explains when the dispute was closed before the comment was sent', async () => {
    let closed = false;
    const { user } = renderDispute(
      () =>
        jsonResponse(
          closed
            ? { ...refunded, comments: [customerComment] }
            : { ...approved, comments: [customerComment] },
        ),
      {
        [COMMENT]: () => {
          closed = true;
          return problemResponse(
            409,
            'dispute_closed',
            'Comments can only be added while a dispute is open.',
          );
        },
      },
    );

    await user.type(await screen.findByRole('textbox', { name: 'Add a comment' }), 'Any news?');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Your comment was not added');
    expect(alert).toHaveTextContent(
      'This dispute was closed before your comment was sent. This page now shows its latest status.',
    );
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Refunded', { selector: 'span' })).toBeInTheDocument();
  });
});
