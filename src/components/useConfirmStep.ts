import { useCallback, useEffect, useRef, useState } from 'react';

export interface ConfirmStep<Step extends string> {
  /** The confirmation step that is open, or null while the buttons are shown. */
  step: Step | null;
  open: (step: Step) => void;
  cancel: () => void;
  /** Ref for the button that opens a step, so focus can return to it. */
  openerRef: (step: Step) => (element: HTMLButtonElement | null) => void;
}

/**
 * State for buttons that each open a confirmation step in their place (see ConfirmPanel).
 * Cancelling brings the buttons back and returns focus to the one that was used, so keyboard
 * and screen reader users are not left at the top of the page.
 */
export function useConfirmStep<Step extends string>(): ConfirmStep<Step> {
  const [step, setStep] = useState<Step | null>(null);
  const openers = useRef(new Map<Step, HTMLButtonElement | null>());
  const returnFocusTo = useRef<Step | null>(null);

  useEffect(() => {
    if (step === null && returnFocusTo.current !== null) {
      openers.current.get(returnFocusTo.current)?.focus();
      returnFocusTo.current = null;
    }
  }, [step]);

  const cancel = useCallback(() => {
    setStep((current) => {
      returnFocusTo.current = current;
      return null;
    });
  }, []);

  const openerRef = useCallback(
    (name: Step) => (element: HTMLButtonElement | null) => {
      openers.current.set(name, element);
    },
    [],
  );

  return { step, open: setStep, cancel, openerRef };
}
