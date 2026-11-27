import {
  cardEntryModeLabel,
  cardVerificationLabel,
  disputeReasonLabel,
  disputeStatusLabel,
  mandateTypeLabel,
  transactionTypeLabel,
  transactionTypeNoun,
} from './labels';

describe('mandateTypeLabel', () => {
  it('shows Registered as Registered Mandate and leaves DebiCheck alone', () => {
    expect(mandateTypeLabel('Registered')).toBe('Registered Mandate');
    expect(mandateTypeLabel('DebiCheck')).toBe('DebiCheck');
  });

  it('shows the EFT debit order type in capitals', () => {
    expect(mandateTypeLabel('Eft')).toBe('EFT');
  });

  it('falls back to readable words for an unknown type', () => {
    expect(mandateTypeLabel('OnceOffAuthority')).toBe('Once off authority');
  });
});

describe('disputeStatusLabel', () => {
  it.each([
    ['Submitted', 'Submitted'],
    ['SentToScheme', 'Processing'],
    ['Refunded', 'Refunded'],
    ['Declined', 'Declined'],
    ['UnderReview', 'Under review'],
  ])('labels %s as %s', (status, label) => {
    expect(disputeStatusLabel(status)).toBe(label);
  });
});

describe('disputeReasonLabel', () => {
  it('appends a card scheme code in brackets', () => {
    expect(disputeReasonLabel('I was charged twice', '12.6')).toBe('I was charged twice (12.6)');
  });

  it('appends the ISO code in brackets', () => {
    expect(disputeReasonLabel('The amount is not what I agreed to', 'AM09')).toBe(
      'The amount is not what I agreed to (AM09)',
    );
  });

  it('leaves the description alone when there is no code', () => {
    expect(disputeReasonLabel('Other', '')).toBe('Other');
  });
});

describe('transactionTypeLabel', () => {
  it.each([
    ['DebitOrder', 'Debit order', 'debit order'],
    ['Card', 'Card transaction', 'card transaction'],
    ['Cheque', 'Transaction', 'transaction'],
  ])('names %s as %s, and %s inside a sentence', (type, label, noun) => {
    expect(transactionTypeLabel(type)).toBe(label);
    expect(transactionTypeNoun(type)).toBe(noun);
  });
});

describe('cardEntryModeLabel', () => {
  it.each([
    ['Chip', 'Chip'],
    ['Contactless', 'Tap (contactless)'],
    ['ECommerce', 'Online'],
    ['Recurring', 'Recurring payment'],
    ['MagneticStripe', 'Magnetic stripe'],
  ])('labels %s as %s', (entryMode, label) => {
    expect(cardEntryModeLabel(entryMode)).toBe(label);
  });
});

describe('cardVerificationLabel', () => {
  it.each([
    ['Pin', 'PIN'],
    ['ThreeDSecure', '3-D Secure'],
    ['None', 'Not verified'],
    ['Signature', 'Signature'],
  ])('labels %s as %s', (verification, label) => {
    expect(cardVerificationLabel(verification)).toBe(label);
  });
});
