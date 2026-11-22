import { useCallback, useRef } from 'react';

interface IssuedKey {
  fingerprint: string;
  key: string;
}

/**
 * Issues the `Idempotency-Key` for a submission.
 *
 * One key is created per form instance and reused for every retry of the same payload, so a
 * retry after a timeout or a dropped connection can never create a second dispute. If the
 * customer goes back and changes the payload, a new key is issued, because the API rejects a
 * key that is replayed with different content.
 */
export function useIdempotencyKey(): (payload: unknown) => string {
  const issued = useRef<IssuedKey | null>(null);

  return useCallback((payload: unknown) => {
    const fingerprint = JSON.stringify(payload);
    if (issued.current?.fingerprint !== fingerprint) {
      issued.current = { fingerprint, key: crypto.randomUUID() };
    }
    return issued.current.key;
  }, []);
}
