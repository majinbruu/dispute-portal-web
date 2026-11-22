import type {
  DebitOrder,
  DisputeDetail,
  DisputeReason,
  DisputeSummary,
  Mandate,
  Notification,
} from '../api/types';

export const DEBIT_ORDER_ID = '11111111-1111-4111-8111-111111111111';
export const MANDATE_ID = '22222222-2222-4222-8222-222222222222';
export const DISPUTE_ID = '33333333-3333-4333-8333-333333333333';
export const NOTIFICATION_ID = '44444444-4444-4444-8444-444444444444';

export function debitOrder(overrides: Partial<DebitOrder> = {}): DebitOrder {
  return {
    id: DEBIT_ORDER_ID,
    transactionId: 'TXN-20260301-0001',
    endToEndId: 'E2E-0001',
    creditorName: 'FitLife Gym',
    creditorShortName: 'FITLIFE',
    statementText: 'FITLIFE GYM MEMBERSHIP',
    amount: 499.0,
    currency: 'ZAR',
    actionDate: '2026-03-01',
    sequenceType: 'Recurring',
    status: 'Successful',
    statusReasonCode: null,
    statusReason: null,
    debtorAccountMasked: '******4321',
    mandateId: MANDATE_ID,
    mandateType: 'DebiCheck',
    mandateReference: 'MND-0001',
    eligibility: {
      canDispute: true,
      code: 'Eligible',
      message: 'You can dispute this debit order until 9 April 2026.',
      lastDisputeDate: '2026-04-09',
    },
    dispute: null,
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
  { code: 'NOT_AUTHORISED', description: 'I did not authorise this debit order' },
  { code: 'AMOUNT_DIFFERS', description: 'The amount differs from what I agreed to' },
  { code: 'CANCELLED', description: 'I cancelled this debit order' },
];

export function disputeSummary(overrides: Partial<DisputeSummary> = {}): DisputeSummary {
  return {
    id: DISPUTE_ID,
    reference: 'DSP-2026-000123',
    debitOrderId: DEBIT_ORDER_ID,
    creditorName: 'FitLife Gym',
    amount: 499.0,
    currency: 'ZAR',
    actionDate: '2026-03-01',
    reasonCode: 'NOT_AUTHORISED',
    reasonDescription: 'I did not authorise this debit order',
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
    originalTransactionId: 'TXN-20260301-0001',
    mandateType: 'DebiCheck',
    mandateReference: 'MND-0001',
    comment: null,
    outcomeNote: null,
    events: [
      {
        status: 'Submitted',
        description: 'We received your dispute.',
        occurredAt: '2026-03-05T08:15:00Z',
      },
    ],
    ...overrides,
  };
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
