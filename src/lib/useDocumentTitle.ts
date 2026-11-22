import { useEffect } from 'react';

const APP_NAME = 'ACME Bank';

/** Sets the browser tab title for the current screen, e.g. `Inbox | ACME Bank`. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;
  }, [title]);
}
