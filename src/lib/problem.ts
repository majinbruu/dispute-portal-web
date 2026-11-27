/**
 * RFC 9457 problem details as returned by the Dispute Portal API, normalised so the UI never has
 * to guess at the shape of an error.
 */
export interface Problem {
  /** HTTP status, or 0 when the request never reached the server. */
  status: number;
  /** Stable machine-readable code, e.g. `already_disputed`. */
  code: string;
  title: string;
  /** Human-readable explanation; safe to show to the customer. */
  detail: string;
  /** Correlation ID to quote to support. */
  traceId?: string;
  /** Field-level messages for `validation_failed`. */
  errors?: Record<string, string[]>;
}

export const NETWORK_ERROR_CODE = 'network_error';
export const UNKNOWN_ERROR_CODE = 'unknown_error';

const STATUS_FALLBACKS: Record<number, { code: string; title: string; detail: string }> = {
  400: {
    code: 'bad_request',
    title: 'Invalid request',
    detail: 'The request was not valid. Check your details and try again.',
  },
  401: {
    code: 'unauthenticated',
    title: 'Signed out',
    detail: 'Your session has expired. Sign in again to continue.',
  },
  403: {
    code: 'forbidden',
    title: 'Not allowed',
    detail: 'You do not have access to this information.',
  },
  404: {
    code: 'not_found',
    title: 'Not found',
    detail: 'We could not find what you were looking for.',
  },
  429: {
    code: 'rate_limited',
    title: 'Too many requests',
    detail: 'You have made too many requests. Wait a moment and try again.',
  },
};

const GENERIC_FALLBACK = {
  code: UNKNOWN_ERROR_CODE,
  title: 'Something went wrong',
  detail: 'Something went wrong on our side. Please try again.',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function parseErrors(value: unknown): Record<string, string[]> | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value)
    .map(([field, messages]): [string, string[]] => [
      field,
      (Array.isArray(messages) ? messages : [messages]).filter(
        (message): message is string => typeof message === 'string',
      ),
    ])
    .filter(([, messages]) => messages.length > 0);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/**
 * Builds a {@link Problem} from a response body and status. Tolerates bodies that are not
 * problem documents (for example an HTML error page from a proxy).
 */
export function parseProblem(body: unknown, status: number): Problem {
  const fallback = STATUS_FALLBACKS[status] ?? GENERIC_FALLBACK;
  if (!isRecord(body)) {
    return { status, ...fallback };
  }
  const errors = parseErrors(body.errors);
  return {
    status,
    code: nonEmptyString(body.code) ?? fallback.code,
    title: nonEmptyString(body.title) ?? fallback.title,
    detail: nonEmptyString(body.detail) ?? fallback.detail,
    ...(nonEmptyString(body.traceId) ? { traceId: nonEmptyString(body.traceId) } : {}),
    ...(errors ? { errors } : {}),
  };
}

/** An error carrying the problem document for a failed API call. */
export class ApiError extends Error {
  readonly problem: Problem;

  constructor(problem: Problem, options?: ErrorOptions) {
    super(problem.detail, options);
    this.name = 'ApiError';
    this.problem = problem;
  }

  get status(): number {
    return this.problem.status;
  }

  get code(): string {
    return this.problem.code;
  }
}

export function networkProblem(): Problem {
  return {
    status: 0,
    code: NETWORK_ERROR_CODE,
    title: 'Connection problem',
    detail: 'We could not reach ACME Bank. Check your connection and try again.',
  };
}

/** Converts anything thrown into a {@link Problem} the UI can render. */
export function toProblem(error: unknown): Problem {
  if (error instanceof ApiError) return error.problem;
  return { status: 0, ...GENERIC_FALLBACK };
}

/**
 * True when the API refused a change because the record had already changed: someone else acted
 * on it first, so what the screen shows is out of date.
 */
export function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

/** Flattens field-level validation messages into a list for display. */
export function validationMessages(problem: Problem): string[] {
  return Object.values(problem.errors ?? {}).flat();
}
