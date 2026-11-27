import { ApiError, networkProblem, parseProblem, toProblem, validationMessages } from './problem';

describe('parseProblem', () => {
  it('reads an RFC 9457 problem document with code and traceId', () => {
    const problem = parseProblem(
      {
        type: 'https://acme.example/problems/already-disputed',
        title: 'Already disputed',
        status: 409,
        detail: 'This transaction has already been disputed.',
        code: 'already_disputed',
        traceId: '00-abc-def-01',
      },
      409,
    );

    expect(problem).toEqual({
      status: 409,
      code: 'already_disputed',
      title: 'Already disputed',
      detail: 'This transaction has already been disputed.',
      traceId: '00-abc-def-01',
    });
  });

  it('keeps field errors for validation problems', () => {
    const problem = parseProblem(
      {
        title: 'Validation failed',
        detail: 'One or more fields are invalid.',
        code: 'validation_failed',
        errors: {
          transactionId: ['Transaction is not valid.'],
          reasonCode: 'Reason is required.',
          bad: [1],
        },
      },
      400,
    );

    expect(problem.errors).toEqual({
      transactionId: ['Transaction is not valid.'],
      reasonCode: ['Reason is required.'],
    });
    expect(validationMessages(problem)).toEqual([
      'Transaction is not valid.',
      'Reason is required.',
    ]);
  });

  it.each([
    [400, 'bad_request'],
    [401, 'unauthenticated'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [429, 'rate_limited'],
    [500, 'unknown_error'],
    [502, 'unknown_error'],
  ])('falls back by status %i when the body is not a problem document', (status, code) => {
    for (const body of [undefined, null, '<html>Bad gateway</html>', ['x']]) {
      const problem = parseProblem(body, status);
      expect(problem.status).toBe(status);
      expect(problem.code).toBe(code);
      expect(problem.detail).not.toBe('');
      expect(problem.traceId).toBeUndefined();
    }
  });

  it('fills in blank fields from the status fallback', () => {
    const problem = parseProblem({ title: '', detail: null, traceId: 'trace-1' }, 404);

    expect(problem.code).toBe('not_found');
    expect(problem.title).toBe('Not found');
    expect(problem.detail).toMatch(/could not find/i);
    expect(problem.traceId).toBe('trace-1');
  });

  it('omits errors when the map is empty or malformed', () => {
    expect(parseProblem({ errors: {} }, 400).errors).toBeUndefined();
    expect(parseProblem({ errors: 'nope' }, 400).errors).toBeUndefined();
    expect(validationMessages(parseProblem({}, 400))).toEqual([]);
  });
});

describe('ApiError', () => {
  it('exposes the problem, status and code', () => {
    const error = new ApiError(parseProblem({ code: 'rate_limited', detail: 'Slow down.' }, 429));

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Slow down.');
    expect(error.status).toBe(429);
    expect(error.code).toBe('rate_limited');
  });
});

describe('toProblem', () => {
  it('unwraps an ApiError', () => {
    const problem = networkProblem();
    expect(toProblem(new ApiError(problem))).toBe(problem);
  });

  it('never leaks unexpected error messages to the user', () => {
    const problem = toProblem(new TypeError("Cannot read properties of undefined (reading 'x')"));

    expect(problem.code).toBe('unknown_error');
    expect(problem.detail).toBe('Something went wrong on our side. Please try again.');
  });

  it('describes a network failure', () => {
    expect(networkProblem()).toMatchObject({ status: 0, code: 'network_error' });
  });
});
