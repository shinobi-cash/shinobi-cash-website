import { useAuth } from "@/contexts/AuthContext";
import { getPublicClient } from "@/lib/clients";
import { noteDiscoveryService } from "@/features/notes/services/NoteDiscoveryService";
import { showToast } from "@/lib/toast";
import { fetchLatestIndexedBlock } from "@/services/data/indexerService";
import type React from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { logError } from "@/lib/errors";

export type TrackingStatus = "idle" | "pending" | "waiting" | "synced" | "failed";

interface TransactionInfo {
  hash: string;
  chainId: number;
  blockNumber: number | null;
}

interface TransactionTrackingContextType {
  trackTransaction: (txHash: string, chainId: number) => void;
  onTransactionIndexed: (callback: () => void) => () => void;
  trackingStatus: TrackingStatus;
  trackedTxHash: string | null;
}

const TransactionTrackingContext = createContext<TransactionTrackingContextType | null>(null);

export function useTransactionTracking() {
  const context = useContext(TransactionTrackingContext);
  if (!context) {
    throw new Error("useTransactionTracking must be used within TransactionTrackingProvider");
  }
  return context;
}

// Use pre-configured singleton service
const discoveryService = noteDiscoveryService;

export function TransactionTrackingProvider({ children }: { children: React.ReactNode }) {
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("idle");
  const [trackedTransaction, setTrackedTransaction] = useState<TransactionInfo | null>(null);
  const eventTargetRef = useRef(new EventTarget());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { publicKey, accountKey } = useAuth();

  /**
   * Clears tracking immediately and cancels timers
   */
  const clearTracking = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTrackedTransaction(null);
    setTrackingStatus("idle");
  }, []);

  /**
   * Starts auto-clear timer (default 5 minutes)
   */
  const scheduleAutoClear = useCallback(
    (ms: number = 5 * 60 * 1000) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        clearTracking();
      }, ms);
    },
    [clearTracking]
  );

  /**
   * Track a new transaction
   */
  const trackTransaction = useCallback(
    (txHash: string, chainId: number) => {
      clearTracking();

      const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
      showToast.success(`${shortHash} • Confirming transaction...`, {
        duration: 3000,
      });

      setTrackedTransaction({ hash: txHash, chainId, blockNumber: null });
      setTrackingStatus("pending");

      // Auto-clear if it gets stuck for >5 min
      scheduleAutoClear();
    },
    [clearTracking, scheduleAutoClear]
  );

  /**
   * Register a callback when transaction gets indexed
   */
  const onTransactionIndexed = useCallback((callback: () => void) => {
    const eventTarget = eventTargetRef.current;
    const handler = () => callback();
    eventTarget.addEventListener("indexed", handler);
    return () => {
      eventTarget.removeEventListener("indexed", handler);
    };
  }, []);

  /**
   * Wait for transaction receipt
   */
  useEffect(() => {
    if (!trackedTransaction?.hash || !trackedTransaction?.chainId || trackingStatus !== "pending")
      return;

    const waitForReceipt = async () => {
      try {
        // Get the correct public client for the transaction's chain
        const chainClient = getPublicClient(trackedTransaction.chainId);

        const receipt = await chainClient.waitForTransactionReceipt({
          hash: trackedTransaction.hash as `0x${string}`,
          timeout: 60000, // 1 minute
        });

        const shortHash = `${trackedTransaction.hash.slice(0, 6)}...${trackedTransaction.hash.slice(-4)}`;

        if (receipt.status === "success") {
          showToast.success(`${shortHash} • Transaction successful! Indexing...`, {
            duration: 4000,
          });
          setTrackedTransaction((prev) =>
            prev ? { ...prev, blockNumber: Number(receipt.blockNumber) } : null
          );
          setTrackingStatus("waiting");
        } else {
          showToast.error(`${shortHash} • Transaction failed`, {
            duration: 5000,
          });
          setTrackingStatus("failed");
          scheduleAutoClear(5000);
        }
      } catch (error) {
        const shortHash = `${trackedTransaction.hash.slice(0, 6)}...${trackedTransaction.hash.slice(-4)}`;

        // Use standardized error handling
        showToast.handleError(error, {
          action: `${shortHash} • Transaction`,
          fallbackMessage: "Transaction timeout",
          context: {
            component: "useTransactionTracking",
            hash: trackedTransaction.hash,
            chainId: trackedTransaction.chainId,
          },
        });

        setTrackingStatus("failed");
        scheduleAutoClear(5000);
      }
    };

    waitForReceipt();
  }, [trackedTransaction?.hash, trackedTransaction?.chainId, trackingStatus, scheduleAutoClear]);

  /**
   * Poll until transaction is indexed
   */
  useEffect(() => {
    if (
      !trackedTransaction?.hash ||
      trackingStatus !== "waiting" ||
      trackedTransaction.blockNumber === null
    ) {
      return;
    }

    const checkTransactionIndexed = async () => {
      try {
        const indexedBlockInfo = await fetchLatestIndexedBlock();
        if (
          indexedBlockInfo &&
          trackedTransaction.blockNumber !== null &&
          Number.parseInt(indexedBlockInfo.blockNumber) >= trackedTransaction.blockNumber
        ) {
          showToast.success("Transaction indexed!", { duration: 3000 });
          setTrackingStatus("synced");

          if (publicKey && accountKey) {
            discoveryService
              .discoverNotes(publicKey, SHINOBI_CASH_ETH_POOL.address, accountKey)
              .catch((err) => {
                // Log but don't show toast (background operation)
                logError(err, {
                  action: "autoSyncNotes",
                  component: "useTransactionTracking",
                  suppressed: true,
                });
              });
          }

          eventTargetRef.current.dispatchEvent(new CustomEvent("indexed"));

          // Auto-clear after 10s
          scheduleAutoClear(10000);
        }
      } catch (error) {
        // Log but don't show toast (polling operation, non-critical)
        logError(error, {
          action: "checkTransactionIndexed",
          component: "useTransactionTracking",
          suppressed: true,
        });
      }
    };

    checkTransactionIndexed();
    intervalRef.current = setInterval(checkTransactionIndexed, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    trackedTransaction?.hash,
    trackedTransaction?.blockNumber,
    trackingStatus,
    publicKey,
    accountKey,
    scheduleAutoClear,
  ]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      clearTracking();
    };
  }, [clearTracking]);

  const contextValue = {
    trackTransaction,
    onTransactionIndexed,
    trackingStatus,
    trackedTxHash: trackedTransaction?.hash || null,
  };

  return (
    <TransactionTrackingContext.Provider value={contextValue}>
      {children}
    </TransactionTrackingContext.Provider>
  );
}
