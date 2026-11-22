import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { queryKeys } from '../../api/queryKeys';
import type { DisputeStatus } from '../../api/types';

/**
 * When polling sees a dispute move to a new status, everything derived from it is stale: the
 * pending and completed lists, the debit order's dispute link, and the inbox, which receives a
 * notification for each step. Invalidate them so other screens are right when the user gets there.
 */
export function useDisputeStatusSync(status: DisputeStatus | undefined): void {
  const queryClient = useQueryClient();
  const previous = useRef(status);

  useEffect(() => {
    const changed = previous.current !== undefined && previous.current !== status;
    previous.current = status;
    if (changed) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.disputes.lists });
      void queryClient.invalidateQueries({ queryKey: queryKeys.debitOrders.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    }
  }, [status, queryClient]);
}
