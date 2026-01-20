import { useSnapshot } from "valtio";
import { useCallback } from "react";
import {
  TransactionTrackingController,
  type TrackingStatus,
} from "@/controllers/TransactionTrackingController";

interface TransactionTrackingHook {
  trackTransaction: (txHash: string, chainId: number) => void;
  onTransactionIndexed: (callback: () => void) => () => void;
  trackingStatus: TrackingStatus;
  trackedTxHash: string | null;
  trackedChainId: number | null;
}

/**
 * Hook adapter for TransactionTrackingController
 * Provides reactive access to tracking state via valtio snapshot
 */
export function useTransactionTracking(): TransactionTrackingHook {
  const state = useSnapshot(TransactionTrackingController.state);

  const trackTransaction = useCallback((txHash: string, chainId: number) => {
    TransactionTrackingController.trackTransaction(txHash, chainId);
  }, []);

  const onTransactionIndexed = useCallback((callback: () => void) => {
    return TransactionTrackingController.onTransactionIndexed(callback);
  }, []);

  return {
    trackTransaction,
    onTransactionIndexed,
    trackingStatus: state.status,
    trackedTxHash: state.transaction?.hash ?? null,
    trackedChainId: state.transaction?.chainId ?? null,
  };
}

// Re-export type for backward compatibility
export type { TrackingStatus };
