import { ApiError, networkProblem, parseProblem } from '../lib/problem';
import { createQueryClient, shouldRetry } from './queryClient';

describe('shouldRetry', () => {
  it('retries network failures and server errors', () => {
    expect(shouldRetry(0, new ApiError(networkProblem()))).toBe(true);
    expect(shouldRetry(1, new ApiError(parseProblem(null, 503)))).toBe(true);
  });

  it('gives up after two retries', () => {
    expect(shouldRetry(2, new ApiError(networkProblem()))).toBe(false);
  });

  it.each([400, 401, 403, 404, 409, 422, 429])('does not retry a %i', (status) => {
    expect(shouldRetry(0, new ApiError(parseProblem(null, status)))).toBe(false);
  });

  it('does not retry unexpected errors', () => {
    expect(shouldRetry(0, new TypeError('bug'))).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('refetches on focus and never retries mutations automatically', () => {
    const options = createQueryClient().getDefaultOptions();

    expect(options.queries?.refetchOnWindowFocus).toBe(true);
    expect(options.mutations?.retry).toBe(false);
  });
});
