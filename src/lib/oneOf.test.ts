import { oneOf } from './oneOf';

describe('oneOf', () => {
  const sizes = ['small', 'large'] as const;

  it('returns a value that is allowed', () => {
    expect(oneOf(sizes, 'large')).toBe('large');
  });

  it.each([['medium'], ['LARGE'], [''], [null]])('returns undefined for %j', (value) => {
    expect(oneOf(sizes, value)).toBeUndefined();
  });
});
