import { disputeReasonLabel, disputeStatusLabel, mandateTypeLabel } from './labels';

describe('mandateTypeLabel', () => {
  it('shows Registered as Registered Mandate and leaves DebiCheck alone', () => {
    expect(mandateTypeLabel('Registered')).toBe('Registered Mandate');
    expect(mandateTypeLabel('DebiCheck')).toBe('DebiCheck');
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
  it('appends the ISO code in brackets', () => {
    expect(disputeReasonLabel('The amount is not what I agreed to', 'AM09')).toBe(
      'The amount is not what I agreed to (AM09)',
    );
  });

  it('leaves the description alone when there is no code', () => {
    expect(disputeReasonLabel('Other', '')).toBe('Other');
  });
});
