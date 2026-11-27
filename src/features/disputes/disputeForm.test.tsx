import { renderHook, screen, within } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import { jsonResponse, problemResponse, requestsTo } from '../../test/apiMock';
import {
  CARD_TRANSACTION_ID,
  cardDisputeDetail,
  cardDisputeReasons,
  cardTransaction,
  debitOrder,
  DISPUTE_ID,
  disputeDetail,
  disputeReasons,
  eftDebitOrder,
  TRANSACTION_ID,
} from '../../test/fixtures';
import { renderApp } from '../../test/renderApp';
import { disputeRoutes } from './routes';
import { describeSubmitError } from './submitErrors';
import { useIdempotencyKey } from './useIdempotencyKey';

const ORDER = `GET /api/v1/transactions/${TRANSACTION_ID}`;
const CARD = `GET /api/v1/transactions/${CARD_TRANSACTION_ID}`;
const REASONS = 'GET /api/v1/dispute-reasons';
const SUBMIT = 'POST /api/v1/disputes';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Stubs come first so they win over the real dispute screens, which have their own tests.
const routes: RouteObject[] = [
  { path: 'disputes/:id', element: <p>Dispute progress screen</p> },
  { path: 'transactions/:id', element: <p>Transaction screen</p> },
  ...disputeRoutes,
];

type SubmitHandler = (request: Request) => Response | Promise<Response>;

function renderForm(submit: SubmitHandler = () => jsonResponse(disputeDetail(), 201)) {
  return renderApp({
    routes,
    at: `/transactions/${TRANSACTION_ID}/dispute`,
    api: { [ORDER]: debitOrder(), [REASONS]: disputeReasons, [SUBMIT]: submit },
  });
}

type User = ReturnType<typeof renderForm>['user'];

async function chooseReasonAndContinue(
  user: User,
  reason = 'I did not authorise this debit order (MD01)',
) {
  await user.click(await screen.findByRole('radio', { name: reason }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByRole('heading', { name: 'Review your dispute' });
}

describe('dispute form', () => {
  it('loads the reasons the API offers for this transaction, with codes in brackets', async () => {
    const { fetchMock } = renderForm();

    const group = await screen.findByRole('group', {
      name: 'Why are you disputing this debit order?',
    });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => (radio as HTMLInputElement).labels![0]!.textContent),
    ).toEqual([
      'I did not authorise this debit order (MD01)',
      'The amount is not what I agreed to (AM09)',
      'I cancelled this agreement (MD06)',
    ]);
    const [request] = requestsTo(fetchMock, 'GET', '/api/v1/dispute-reasons');
    expect(new URL(request!.url).search).toBe(`?transactionId=${TRANSACTION_ID}`);
    expect(screen.getByRole('heading', { level: 1, name: 'Dispute a transaction' })).toBeVisible();
    expect(screen.getByText('FitLife Gym')).toBeInTheDocument();
    expect(screen.getByText('FITLIFE GYM MEMBERSHIP · 01 Mar 2026')).toBeInTheDocument();
  });

  it('requires a reason before moving to the review step', async () => {
    const { user, fetchMock } = renderForm();
    await screen.findByRole('group', { name: 'Why are you disputing this debit order?' });

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a reason for your dispute');
    expect(screen.queryByRole('heading', { name: 'Review your dispute' })).not.toBeInTheDocument();
    expect(requestsTo(fetchMock, 'POST', '/api/v1/disputes')).toHaveLength(0);
  });

  it('asks only for a reason', async () => {
    renderForm();
    await screen.findByRole('group', { name: 'Why are you disputing this debit order?' });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows a review step before anything is submitted, and lets the customer go back', async () => {
    const { user, fetchMock } = renderForm();
    await user.click(
      await screen.findByRole('radio', { name: 'The amount is not what I agreed to (AM09)' }),
    );
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const heading = await screen.findByRole('heading', { name: 'Review your dispute' });
    expect(heading).toHaveFocus();
    expect(screen.getByText('The amount is not what I agreed to (AM09)')).toBeInTheDocument();
    expect(screen.getByText('DebiCheck', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText(/R\s499,00/, { selector: 'dd' })).toBeInTheDocument();
    expect(requestsTo(fetchMock, 'POST', '/api/v1/disputes')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(
      await screen.findByRole('radio', { name: 'The amount is not what I agreed to (AM09)' }),
    ).toBeChecked();
  });

  it('submits the dispute with an Idempotency-Key and opens the dispute', async () => {
    const { user, fetchMock, router } = renderForm();
    await user.click(
      await screen.findByRole('radio', { name: 'I did not authorise this debit order (MD01)' }),
    );
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(await screen.findByRole('button', { name: 'Submit dispute' }));

    expect(await screen.findByText('Dispute progress screen')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/disputes/${DISPUTE_ID}`);

    const [request] = requestsTo(fetchMock, 'POST', '/api/v1/disputes');
    expect(request!.headers.get('Idempotency-Key')).toMatch(UUID);
    expect(request!.headers.get('Authorization')).toBe('Bearer test-token');
    expect(await request!.clone().json()).toEqual({
      transactionId: TRANSACTION_ID,
      reasonId: 'not_authorised',
    });
  });

  it('reuses the Idempotency-Key when the same submission is retried', async () => {
    let attempts = 0;
    const { user, fetchMock } = renderForm(() => {
      attempts += 1;
      return attempts === 1
        ? Promise.reject(new TypeError('Failed to fetch'))
        : jsonResponse(disputeDetail(), 201);
    });
    await chooseReasonAndContinue(user);

    await user.click(screen.getByRole('button', { name: 'Submit dispute' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not confirm your dispute. It is safe to try again',
    );

    await user.click(screen.getByRole('button', { name: 'Submit dispute' }));
    await screen.findByText('Dispute progress screen');

    const keys = requestsTo(fetchMock, 'POST', '/api/v1/disputes').map((request) =>
      request.headers.get('Idempotency-Key'),
    );
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(UUID);
    expect(keys[1]).toBe(keys[0]);
  });

  it('uses a new Idempotency-Key when the customer changes the submission', async () => {
    let attempts = 0;
    const { user, fetchMock } = renderForm(() => {
      attempts += 1;
      return attempts === 1
        ? problemResponse(422, 'reason_not_allowed', 'This reason is not allowed for DebiCheck.')
        : jsonResponse(disputeDetail(), 201);
    });
    await chooseReasonAndContinue(user);
    await user.click(screen.getByRole('button', { name: 'Submit dispute' }));
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await chooseReasonAndContinue(user, 'I cancelled this agreement (MD06)');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit dispute' }));
    await screen.findByText('Dispute progress screen');

    const [first, second] = requestsTo(fetchMock, 'POST', '/api/v1/disputes');
    expect(second!.headers.get('Idempotency-Key')).not.toBe(first!.headers.get('Idempotency-Key'));
    expect(await second!.clone().json()).toMatchObject({ reasonId: 'cancelled' });
  });

  it('disables the buttons while the dispute is being submitted', async () => {
    let release: (response: Response) => void = () => undefined;
    const { user } = renderForm(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    await chooseReasonAndContinue(user);

    await user.click(screen.getByRole('button', { name: 'Submit dispute' }));

    expect(await screen.findByRole('button', { name: 'Submitting…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();

    release(jsonResponse(disputeDetail(), 201));
    await screen.findByText('Dispute progress screen');
  });

  describe('API errors', () => {
    it.each([
      [409, 'already_disputed', 'This transaction has already been disputed'],
      [422, 'dispute_window_closed', 'The time allowed to dispute this transaction has passed'],
      [
        422,
        'within_mandate_terms',
        'This debit order was collected within the terms of your mandate',
      ],
      [422, 'collection_rejected', 'This collection was rejected, so there is nothing to dispute'],
      [422, 'not_a_purchase', 'Only card purchases can be disputed here'],
      [422, 'not_settled', 'This card transaction has not been settled yet'],
      [422, 'fully_refunded', 'This card transaction has already been refunded in full'],
      [422, 'reason_not_allowed', 'That reason cannot be used for this transaction'],
      [409, 'idempotency_key_reused', 'Your dispute may already have been submitted'],
      [400, 'validation_failed', 'Some of the details you entered are not valid'],
      [429, 'rate_limited', 'Too many attempts. Wait a moment, then try again'],
      [404, 'transaction_not_found', 'We could not find this transaction'],
      [500, 'internal_error', 'We could not submit your dispute'],
    ])('explains a %i %s', async (status, code, message) => {
      const { user, router } = renderForm(() =>
        problemResponse(status, code, `API detail for ${code}.`),
      );
      await chooseReasonAndContinue(user);

      await user.click(screen.getByRole('button', { name: 'Submit dispute' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(message);
      expect(alert).toHaveTextContent(`API detail for ${code}.`);
      expect(alert).toHaveTextContent(`trace-${code}`);
      expect(router.state.location.pathname).toBe(`/transactions/${TRANSACTION_ID}/dispute`);
      expect(screen.getByRole('button', { name: 'Submit dispute' })).toBeEnabled();
    });

    it('offers a link to the debit order when it was already disputed', async () => {
      const { user } = renderForm(() =>
        problemResponse(409, 'already_disputed', 'This transaction has already been disputed.'),
      );
      await chooseReasonAndContinue(user);
      await user.click(screen.getByRole('button', { name: 'Submit dispute' }));

      const alert = await screen.findByRole('alert');
      const link = within(alert).getByRole('link', { name: 'View this debit order' });
      expect(link).toHaveAttribute('href', `/transactions/${TRANSACTION_ID}`);

      await user.click(link);
      expect(await screen.findByText('Transaction screen')).toBeInTheDocument();
    });

    it('lists field messages for a validation problem', async () => {
      const { user } = renderForm(() =>
        problemResponse(400, 'validation_failed', 'One or more fields are invalid.', {
          errors: { reasonId: ['Reason is not recognised.'] },
        }),
      );
      await chooseReasonAndContinue(user);
      await user.click(screen.getByRole('button', { name: 'Submit dispute' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Reason is not recognised.');
    });

    it('points to the dispute history when the key was already used', async () => {
      const { user } = renderForm(() =>
        problemResponse(409, 'idempotency_key_reused', 'Key reused with a different request.'),
      );
      await chooseReasonAndContinue(user);
      await user.click(screen.getByRole('button', { name: 'Submit dispute' }));

      const alert = await screen.findByRole('alert');
      expect(within(alert).getByRole('link', { name: 'View dispute history' })).toHaveAttribute(
        'href',
        '/disputes',
      );
    });
  });
});

describe('dispute form for an EFT debit order', () => {
  it('offers the reasons for that debit order and shows EFT on the review step', async () => {
    const { user, fetchMock } = renderApp({
      routes,
      at: `/transactions/${TRANSACTION_ID}/dispute`,
      api: {
        [ORDER]: eftDebitOrder(),
        [REASONS]: disputeReasons,
        [SUBMIT]: () => jsonResponse(disputeDetail({ mandateType: 'Eft' }), 201),
      },
    });

    await chooseReasonAndContinue(user);

    expect(screen.getByText('City of Cape Town', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('EFT', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.queryByText('Card')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Submit dispute' }));
    await screen.findByText('Dispute progress screen');
    const [request] = requestsTo(fetchMock, 'POST', '/api/v1/disputes');
    expect(await request!.clone().json()).toEqual({
      transactionId: TRANSACTION_ID,
      reasonId: 'not_authorised',
    });
  });
});

describe('dispute form for a card purchase', () => {
  function renderCardForm(submit: SubmitHandler = () => jsonResponse(cardDisputeDetail(), 201)) {
    return renderApp({
      routes,
      at: `/transactions/${CARD_TRANSACTION_ID}/dispute`,
      api: { [CARD]: cardTransaction(), [REASONS]: cardDisputeReasons, [SUBMIT]: submit },
    });
  }

  it('summarises the purchase and offers the card reasons with their scheme codes', async () => {
    const { fetchMock } = renderCardForm();

    const group = await screen.findByRole('group', {
      name: 'Why are you disputing this card transaction?',
    });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => (radio as HTMLInputElement).labels![0]!.textContent),
    ).toEqual([
      'I did not make this transaction (10.4)',
      'I was charged twice (12.6)',
      'I did not receive the goods or service (13.1)',
    ]);
    const [request] = requestsTo(fetchMock, 'GET', '/api/v1/dispute-reasons');
    expect(new URL(request!.url).search).toBe(`?transactionId=${CARD_TRANSACTION_ID}`);
    expect(screen.getByText('Takealot')).toBeInTheDocument();
    expect(screen.getByText('Visa ************4821 · Cape Town · 03 Mar 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      `/transactions/${CARD_TRANSACTION_ID}`,
    );
  });

  it('requires a reason before the review step', async () => {
    const { user } = renderCardForm();
    await screen.findByRole('group', { name: 'Why are you disputing this card transaction?' });

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a reason for your dispute');
  });

  it('reviews the merchant and card, with no mandate, then submits the reason id', async () => {
    const { user, fetchMock, router } = renderCardForm();
    await chooseReasonAndContinue(user, 'I did not receive the goods or service (13.1)');

    expect(screen.getByText('Merchant', { selector: 'dt' })).toBeInTheDocument();
    expect(screen.getByText('Takealot', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('Visa ************4821', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText(/R\s1\s899,00/, { selector: 'dd' })).toBeInTheDocument();
    expect(
      screen.getByText('I did not receive the goods or service (13.1)', { selector: 'dd' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Mandate type')).not.toBeInTheDocument();
    expect(screen.queryByText('Company')).not.toBeInTheDocument();
    expect(requestsTo(fetchMock, 'POST', '/api/v1/disputes')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Submit dispute' }));

    expect(await screen.findByText('Dispute progress screen')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/disputes/${DISPUTE_ID}`);
    const [request] = requestsTo(fetchMock, 'POST', '/api/v1/disputes');
    expect(request!.headers.get('Idempotency-Key')).toMatch(UUID);
    expect(await request!.clone().json()).toEqual({
      transactionId: CARD_TRANSACTION_ID,
      reasonId: 'not_received',
    });
  });

  it('links back to the card transaction when the API refuses the dispute', async () => {
    const { user } = renderCardForm(() =>
      problemResponse(422, 'fully_refunded', 'This transaction was refunded in full.'),
    );
    await chooseReasonAndContinue(user, 'I was charged twice (12.6)');
    await user.click(screen.getByRole('button', { name: 'Submit dispute' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This card transaction has already been refunded in full');
    expect(within(alert).getByRole('link', { name: 'View this card transaction' })).toHaveAttribute(
      'href',
      `/transactions/${CARD_TRANSACTION_ID}`,
    );
  });

  it('does not offer the form for a card transaction that cannot be disputed', async () => {
    renderApp({
      routes,
      at: `/transactions/${CARD_TRANSACTION_ID}/dispute`,
      api: {
        [CARD]: cardTransaction({
          eligibility: {
            canDispute: false,
            code: 'NotSettled',
            message: 'This transaction has not been settled yet.',
            lastDisputeDate: '2026-07-01',
          },
        }),
      },
    });

    expect(await screen.findByText('This card transaction cannot be disputed')).toBeVisible();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to card transaction' })).toHaveAttribute(
      'href',
      `/transactions/${CARD_TRANSACTION_ID}`,
    );
  });
});

describe('dispute form page guards', () => {
  it('does not offer the form when the API says the order cannot be disputed', async () => {
    renderApp({
      routes,
      at: `/transactions/${TRANSACTION_ID}/dispute`,
      api: {
        [ORDER]: debitOrder({
          eligibility: {
            canDispute: false,
            code: 'DisputeWindowClosed',
            message: 'The 40 day dispute window for this debit order has closed.',
            lastDisputeDate: '2026-01-10',
          },
        }),
        [REASONS]: disputeReasons,
      },
    });

    expect(
      await screen.findByText('The 40 day dispute window for this debit order has closed.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByText('This debit order cannot be disputed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to debit order' })).toHaveAttribute(
      'href',
      `/transactions/${TRANSACTION_ID}`,
    );
  });

  it('links to the existing dispute instead of offering the form', async () => {
    renderApp({
      routes,
      at: `/transactions/${TRANSACTION_ID}/dispute`,
      api: {
        [ORDER]: debitOrder({
          eligibility: {
            canDispute: false,
            code: 'AlreadyDisputed',
            message: 'This debit order has already been disputed.',
            lastDisputeDate: '2026-04-09',
          },
          dispute: { id: DISPUTE_ID, reference: 'DSP-1', status: 'Submitted' },
        }),
      },
    });

    expect(await screen.findByRole('link', { name: 'View dispute progress' })).toHaveAttribute(
      'href',
      `/disputes/${DISPUTE_ID}`,
    );
  });

  it('shows problems loading the debit order or the reasons', async () => {
    renderApp({
      routes,
      at: `/transactions/${TRANSACTION_ID}/dispute`,
      api: {
        [ORDER]: debitOrder(),
        [REASONS]: () => problemResponse(500, 'internal_error', 'Reasons are unavailable.'),
      },
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load the dispute reasons');
    expect(alert).toHaveTextContent('trace-internal_error');
  });

  it('handles a transaction that does not exist', async () => {
    renderApp({ routes, at: `/transactions/${TRANSACTION_ID}/dispute` });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not load this transaction',
    );
  });

  it('explains when no reasons are available', async () => {
    renderApp({
      routes,
      at: `/transactions/${TRANSACTION_ID}/dispute`,
      api: { [ORDER]: debitOrder(), [REASONS]: [] },
    });

    expect(await screen.findByText('This debit order cannot be disputed online')).toBeVisible();
  });
});

describe('describeSubmitError', () => {
  it('falls back to a generic message for unknown codes', () => {
    expect(describeSubmitError({ status: 418, code: 'teapot', title: 'x', detail: 'y' })).toEqual({
      message: 'We could not submit your dispute',
      action: 'retry',
    });
  });
});

describe('useIdempotencyKey', () => {
  it('keeps one key per payload for the life of the form', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const payload = { transactionId: 'a', reasonId: 'duplicate' };

    const first = result.current(payload);

    expect(first).toMatch(UUID);
    expect(result.current({ ...payload })).toBe(first);
    expect(result.current({ ...payload, reasonId: 'cancelled' })).not.toBe(first);
  });

  it('gives each form instance its own key', () => {
    const payload = { transactionId: 'a', reasonId: 'duplicate' };
    const one = renderHook(() => useIdempotencyKey()).result.current(payload);
    const two = renderHook(() => useIdempotencyKey()).result.current(payload);

    expect(one).not.toBe(two);
  });
});
