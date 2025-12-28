/**
 * Withdrawal Engine Hook
 *
 * Thin React wrapper around WithdrawalEngine.
 * Provides engine lifecycle management and state synchronization.
 */

import { useState, useMemo, useCallback } from "react";
import { WithdrawalEngine } from "../engine/WithdrawalEngine";
import type {
  WithdrawalRequest,
  FeeQuote,
  PreparedUserOperation,
  ExecutionResult,
} from "../domain/types";

// ============ HOOK STATE ============

interface EngineHookState {
  isPreparing: boolean;
  isExecuting: boolean;
  error: Error | null;
  feeQuote: FeeQuote | null;
  preparedUserOp: PreparedUserOperation | null;
  executionResult: ExecutionResult | null;
}

// ============ HOOK ============

/**
 * Hook to use WithdrawalEngine in React components
 *
 * @returns Engine operations and state
 */
export function useWithdrawalEngine() {
  // Create engine instance (persists across renders)
  const engine = useMemo(() => new WithdrawalEngine(), []);

  // Hook state for UI reactivity
  const [state, setState] = useState<EngineHookState>({
    isPreparing: false,
    isExecuting: false,
    error: null,
    feeQuote: null,
    preparedUserOp: null,
    executionResult: null,
  });

  /**
   * Quote fees (Stage 1)
   */
  const quoteFees = useCallback(
    async (request: WithdrawalRequest): Promise<FeeQuote> => {
      try {
        setState((prev) => ({ ...prev, error: null }));
        const feeQuote = await engine.quoteFees(request);
        setState((prev) => ({ ...prev, feeQuote }));
        return feeQuote;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to quote fees");
        setState((prev) => ({ ...prev, error: err }));
        throw err;
      }
    },
    [engine]
  );

  /**
   * Prepare withdrawal (Stages 1-6)
   */
  const prepare = useCallback(
    async (request: WithdrawalRequest): Promise<PreparedUserOperation> => {
      setState((prev) => ({
        ...prev,
        isPreparing: true,
        error: null,
        preparedUserOp: null,
      }));

      try {
        const preparedUserOp = await engine.prepare(request);
        setState((prev) => ({
          ...prev,
          isPreparing: false,
          preparedUserOp,
          feeQuote: engine.getState().feeQuote,
        }));
        return preparedUserOp;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to prepare withdrawal");
        setState((prev) => ({
          ...prev,
          isPreparing: false,
          error: err,
        }));
        throw err;
      }
    },
    [engine]
  );

  /**
   * Execute prepared withdrawal (Stage 7)
   */
  const execute = useCallback(async (): Promise<ExecutionResult> => {
    setState((prev) => ({
      ...prev,
      isExecuting: true,
      error: null,
    }));

    try {
      const result = await engine.execute();
      setState((prev) => ({
        ...prev,
        isExecuting: false,
        executionResult: result,
      }));
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Failed to execute withdrawal");
      setState((prev) => ({
        ...prev,
        isExecuting: false,
        error: err,
      }));
      throw err;
    }
  }, [engine]);

  /**
   * Reset engine and state
   */
  const reset = useCallback(() => {
    engine.reset();
    setState({
      isPreparing: false,
      isExecuting: false,
      error: null,
      feeQuote: null,
      preparedUserOp: null,
      executionResult: null,
    });
  }, [engine]);

  return {
    // Operations
    quoteFees,
    prepare,
    execute,
    reset,

    // State
    isPreparing: state.isPreparing,
    isExecuting: state.isExecuting,
    error: state.error,
    feeQuote: state.feeQuote,
    preparedUserOp: state.preparedUserOp,
    executionResult: state.executionResult,

    // Engine instance (for debugging)
    engine,
  };
}
