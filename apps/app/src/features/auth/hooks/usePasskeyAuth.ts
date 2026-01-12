import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { AuthController } from "../../../controllers/AuthController";

// ============ TYPES ============

interface PasskeyState {
  isProcessing: boolean;
  error: Error | null;
}

interface UsePasskeyAuthOptions {
  /** Optional callback triggered on successful passkey setup */
  onSuccess?: () => void;
  /** Optional callback triggered on error */
  onError?: (error: Error) => void;
}

// ============ UNIFIED HOOK ============

export function usePasskeyAuth(options: UsePasskeyAuthOptions = {}) {
  const [state, setState] = useState<PasskeyState>({
    isProcessing: false,
    error: null,
  });

  // 1. STABILITY FIX:
  // Store callbacks in a ref. This ensures that 'enablePasskey'
  // identity never changes, even if the parent component passes
  // a new inline 'onSuccess' function every render.
  const optionsRef = useRef(options);

  // Update ref on render so we always have the latest callbacks
  useEffect(() => {
    optionsRef.current = options;
  });

  const enablePasskey = useCallback(
    async () => {
      setState({ isProcessing: true, error: null });

      try {
        await AuthController.enablePasskey();
        // Success handling
        setState({ isProcessing: false, error: null });
        optionsRef.current.onSuccess?.(); // Call latest ref
        return true;
      } catch (err) {
        // Error handling
        const error = err instanceof Error ? err : new Error("Passkey enable failed");

        setState({ isProcessing: false, error });
        optionsRef.current.onError?.(error);
        return false;
      }
    },
    [] // No dependencies needed due to refs!
  );

  const removePasskey = useCallback(async () => {
    setState({ isProcessing: true, error: null });
    try {
      await AuthController.removePasskey();
      setState({ isProcessing: false, error: null });
      optionsRef.current.onSuccess?.(); // Call latest ref
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Passkey remove failed");
      setState({ isProcessing: false, error });
      optionsRef.current.onError?.(error);
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // 2. PERFORMANCE FIX:
  // Memoize the return object. This prevents child components
  // from re-rendering just because this hook was called.
  return useMemo(
    () => ({
      isProcessing: state.isProcessing,
      error: state.error,
      enablePasskey,
      removePasskey,
      clearError,
    }),
    [state, enablePasskey, removePasskey, clearError]
  );
}
