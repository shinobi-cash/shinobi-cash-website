import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { AuthController } from "@/controllers/AuthController";

interface PasskeyState {
  isProcessing: boolean;
  error: Error | null;
}

interface UsePasskeyAuthOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function usePasskeyAuth(options: UsePasskeyAuthOptions = {}) {
  const [state, setState] = useState<PasskeyState>({
    isProcessing: false,
    error: null,
  });

  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  const enablePasskey = useCallback(async () => {
    setState({ isProcessing: true, error: null });

    try {
      await AuthController.enablePasskey();
      setState({ isProcessing: false, error: null });
      optionsRef.current.onSuccess?.();
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Passkey enable failed");

      setState({ isProcessing: false, error });
      optionsRef.current.onError?.(error);
      return false;
    }
  }, []);

  const removePasskey = useCallback(async () => {
    setState({ isProcessing: true, error: null });
    try {
      await AuthController.removePasskey();
      setState({ isProcessing: false, error: null });
      optionsRef.current.onSuccess?.();
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
