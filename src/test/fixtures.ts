import type {
  AgentDisputeSummary,
  CardDetail,
  DebitOrderDetail,
  DisputeDetail,
  DisputeReason,
  DisputeSummary,
  Mandate,
  Notification,
  Transaction,
} from '../api/types';

export const TRANSACTION_ID = '11111111-1111-4111-8111-111111111111';
export const CARD_TRANSACTION_ID = '55555555-5555-4555-8555-555555555555';
export const MANDATE_ID = '22222222-2222-4222-8222-222222222222';
export const DISPUTE_ID = '33333333-3333-4333-8333-333333333333';
export const NOTIFICATION_ID = '44444444-4444-4444-8444-444444444444';
export const CUSTOMER_ID = '66666666-6666-4666-8666-666666666666';
export const AGENT_ID = '77777777-7777-4777-8777-777777777777';

/** A DebiCheck debit order; `detail` overrides the debit order's own fields. */
export function debitOrder(
  overrides: Partial<Transaction> = {},
  detail: Partial<DebitOrderDetail> = {},
): Transaction {
  return {
    id: TRANSACTION_ID,
    type: 'DebitOrder',
    counterpartyName: 'FitLife Gym',
    amount: 499.0,
    currency: 'ZAR',
    effectiveDate: '2026-03-01',
    accountMasked: '******4321',
    eligibility: {
      canDispute: true,
      code: 'Eligible',
      message: 'You can dispute this debit order until 9 April 2026.',
      lastDisputeDate: '2026-04-09',
    },
    dispute: null,
    debitOrder: {
      transactionId: 'TXN-20260301-0001',
      endToEndId: 'E2E-0001',
      creditorShortName: 'FITLIFE',
      statementText: 'FITLIFE GYM MEMBERSHIP',
      sequenceType: 'Recurring',
      status: 'Accepted',
      statusReasonCode: null,
      statusReason: null,
      mandateType: 'DebiCheck',
      mandateId: MANDATE_ID,
      mandateReference: 'MND-0001',
      contractReference: 'CTR-7788',
      ...detail,
    },
    card: null,
    ...overrides,
  };
}

/** An EFT debit order: the bank holds no mandate for it, so it has no mandate link. */
export function eftDebitOrder(
  overrides: Partial<Transaction> = {},
  detail: Partial<DebitOrderDetail> = {},
): Transaction {
  return debitOrder(
    { counterpartyName: 'City of Cape Town', ...overrides },
    {
      statementText: 'CITY OF CT RATES',
      mandateType: 'Eft',
      mandateId: null,
      mandateReference: null,
      contractReference: 'RATES-55120',
      ...detail,
    },
  );
}

/** A settled online Visa purchase; `detail` overrides the card's own fields. */
export function cardTransaction(
  overrides: Partial<Transaction> = {},
  detail: Partial<CardDetail> = {},
): Transaction {
  return {
    id: CARD_TRANSACTION_ID,
    type: 'Card',
    counterpartyName: 'Takealot',
    amount: 1899.0,
    currency: 'ZAR',
    effectiveDate: '2026-03-03',
    accountMasked: '******4321',
    eligibility: {
      canDispute: true,
      code: 'Eligible',
      message: 'You can dispute this card transaction until 1 July 2026.',
      lastDisputeDate: '2026-07-01',
    },
    dispute: null,
    debitOrder: null,
    card: {
      cardNumberMasked: '************4821',
      scheme: 'Visa',
      kind: 'Purchase',
      merchantCity: 'Cape Town',
      merchantCountry: 'ZA',
      merchantCategoryCode: '5311',
      transactionDate: '2026-03-02',
      postingDate: '2026-03-03',
      authorisationCode: 'A1B2C3',
      acquirerReferenceNumber: '74012345678901234567890',
      entryMode: 'ECommerce',
      verification: 'None',
      status: 'Settled',
      refundedAmount: 0,
      ...detail,
    },
    ...overrides,
  };
}

export function mandate(overrides: Partial<Mandate> = {}): Mandate {
  return {
    id: MANDATE_ID,
    mandateReference: 'MND-0001',
    contractReference: 'CTR-7788',
    type: 'DebiCheck',
    creditorName: 'FitLife Gym',
    creditorShortName: 'FITLIFE',
    instalmentAmount: 499.0,
    maximumCollectionAmount: 748.5,
    currency: 'ZAR',
    frequency: 'Monthly',
    collectionDay: 1,
    firstCollectionDate: '2025-06-01',
    dateAdjustmentAllowed: true,
    trackingEnabled: true,
    authenticationType: 'Real-time (TT1)',
    authenticatedAt: '2025-05-20T09:30:00Z',
    status: 'Active',
    ...overrides,
  };
}

export const disputeReasons: DisputeReason[] = [
  { id: 'not_authorised', label: 'I did not authorise this debit order', code: 'MD01' },
  { id: 'incorrect_amount', label: 'The amount is not what I agreed to', code: 'AM09' },
  { id: 'cancelled', label: 'I cancelled this agreement', code: 'MD06' },
];

/** The reasons the API offers for an online Visa purchase that was not verified. */
export const cardDisputeReasons: DisputeReason[] = [
  { id: 'not_authorised', label: 'I did not make this transaction', code: '10.4' },
  { id: 'duplicate', label: 'I was charged twice', code: '12.6' },
  { id: 'not_received', label: 'I did not receive the goods or service', code: '13.1' },
];

export function disputeSummary(overrides: Partial<DisputeSummary> = {}): DisputeSummary {
  return {
    id: DISPUTE_ID,
    reference: 'DSP-2026-000123',
    transactionId: TRANSACTION_ID,
    transactionType: 'DebitOrder',
    counterpartyName: 'FitLife Gym',
    amount: 499.0,
    currency: 'ZAR',
    transactionDate: '2026-03-01',
    reasonId: 'not_authorised',
    reasonCode: 'MD01',
    reasonLabel: 'I did not authorise this debit order',
    status: 'Submitted',
    state: 'Pending',
    submittedAt: '2026-03-05T08:15:00Z',
    completedAt: null,
    ...overrides,
  };
}

export function disputeDetail(overrides: Partial<DisputeDetail> = {}): DisputeDetail {
  return {
    ...disputeSummary(),
    schemeReference: 'TXN-20260301-0001',
    mandateType: 'DebiCheck',
    mandateReference: 'MND-0001',
    cardScheme: null,
    outcomeNote: null,
    events: [
      {
        status: 'Submitted',
        description: 'We received your dispute.',
        actor: 'Customer',
        occurredAt: '2026-03-05T08:15:00Z',
      },
    ],
    comments: [],
    ...overrides,
  };
}

/** A dispute of a card purchase: it has a card scheme and no mandate. */
export function cardDisputeDetail(overrides: Partial<DisputeDetail> = {}): DisputeDetail {
  return disputeDetail({
    transactionId: CARD_TRANSACTION_ID,
    transactionType: 'Card',
    counterpartyName: 'Takealot',
    amount: 1899.0,
    transactionDate: '2026-03-03',
    reasonId: 'not_received',
    reasonCode: '13.1',
    reasonLabel: 'I did not receive the goods or service',
    schemeReference: '74012345678901234567890',
    mandateType: null,
    mandateReference: null,
    cardScheme: 'Visa',
    ...overrides,
  });
}

export function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: NOTIFICATION_ID,
    category: 'DisputeReceived',
    title: 'We received your dispute',
    body: 'Your dispute DSP-2026-000123 against FitLife Gym has been received.',
    relatedDisputeId: DISPUTE_ID,
    createdAt: '2026-03-05T08:15:00Z',
    isRead: false,
    ...overrides,
  };
}

/** A dispute as an agent sees it in the queue: any customer's, with that customer's ID. */
export function agentDisputeSummary(
  overrides: Partial<AgentDisputeSummary> = {},
): AgentDisputeSummary {
  return {
    id: DISPUTE_ID,
    reference: 'DSP-2026-000123',
    customerId: CUSTOMER_ID,
    transactionType: 'DebitOrder',
    counterpartyName: 'FitLife Gym',
    amount: 499.0,
    currency: 'ZAR',
    transactionDate: '2026-03-01',
    reasonId: 'not_authorised',
    reasonCode: 'MD01',
    reasonLabel: 'I did not authorise this debit order',
    status: 'Submitted',
    submittedAt: '2026-03-05T08:15:00Z',
    completedAt: null,
    ...overrides,
  };
}
