import { useEffect } from "react";

interface CleanupTarget {
  state: { state: { status: string } };
  reset: () => void;
}

/**
 * Resets a controller on unmount, unless a transaction is in flight.
 * Prevents stale state when navigating away from a flow page.
 */
export function useControllerCleanup(
  controller: CleanupTarget,
  skipStatuses: string[] = ["submitting", "confirming"],
) {
  useEffect(() => {
    return () => {
      const { status } = controller.state.state;
      if (!skipStatuses.includes(status)) {
        controller.reset();
      }
    };
    // Intentional: only run on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
