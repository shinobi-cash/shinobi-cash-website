import { getPublicClient } from "@/lib/clients";
import { showToast } from "@/lib/toast";
import { fetchLatestIndexedBlock } from "@/services/IndexerService";
import { parseUserKey } from "@shinobi-cash/core";
import type React from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { logError } from "@/lib/errors/errors";
import { accountService } from "@/services/AccountService";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";

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
  trackedChainId: number | null;
}

const TransactionTrackingContext = createContext<TransactionTrackingContextType | null>(null);

export function useTransactionTracking() {
  const context = useContext(TransactionTrackingContext);
  if (!context) {
    throw new Error("useTransactionTracking must be used within TransactionTrackingProvider");
  }
  return context;
}

export function TransactionTrackingProvider({ children }: { children: React.ReactNode }) {
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("idle");
  const [trackedTransaction, setTrackedTransaction] = useState<TransactionInfo | null>(null);

  const eventTargetRef = useRef(new EventTarget());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ---- CRYPTO CONTEXT (STORAGE IS SOURCE OF TRUTH) ----
  const cryptoRef = useRef<{
    publicKey: string | null;
    accountKey: bigint | null;
  }>({
    publicKey: null,
    accountKey: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCrypto() {
      try {
        const accountData = await accountService.getAccountData();
        if (!accountData || cancelled) return;

        cryptoRef.current = {
          publicKey: accountData.publicKey ?? null,
          accountKey: parseUserKey(accountData.privateKey),
        };
      } catch {
        // Silent — provider must never block UI
      }
    }

    loadCrypto();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- HELPERS ----

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

  const scheduleAutoClear = useCallback(
    (ms: number = 5 * 60 * 1000) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(clearTracking, ms);
    },
    [clearTracking]
  );

  // ---- PUBLIC API ----

  const trackTransaction = useCallback(
    (txHash: string, chainId: number) => {
      clearTracking();

      const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
      showToast.success(`${shortHash} • Confirming transaction...`, {
        duration: 3000,
      });

      setTrackedTransaction({ hash: txHash, chainId, blockNumber: null });
      setTrackingStatus("pending");

      scheduleAutoClear();
    },
    [clearTracking, scheduleAutoClear]
  );

  const onTransactionIndexed = useCallback((callback: () => void) => {
    const handler = () => callback();
    eventTargetRef.current.addEventListener("indexed", handler);
    return () => {
      eventTargetRef.current.removeEventListener("indexed", handler);
    };
  }, []);

  // ---- WAIT FOR RECEIPT ----

  useEffect(() => {
    if (!trackedTransaction?.hash || trackingStatus !== "pending") {
      return;
    }

    const waitForReceipt = async () => {
      try {
        const client = getPublicClient(trackedTransaction.chainId);
        const receipt = await client.waitForTransactionReceipt({
          hash: trackedTransaction.hash as `0x${string}`,
          timeout: 60_000,
        });

        const shortHash = `${trackedTransaction.hash.slice(
          0,
          6
        )}...${trackedTransaction.hash.slice(-4)}`;

        if (receipt.status === "success") {
          showToast.success(`${shortHash} • Transaction successful! Indexing...`, {
            duration: 4000,
          });

          setTrackedTransaction((prev) =>
            prev
              ? {
                  ...prev,
                  blockNumber: Number(receipt.blockNumber),
                }
              : null
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
        showToast.handleError(error, {
          action: "Transaction",
          fallbackMessage: "Transaction timeout",
        });
        setTrackingStatus("failed");
        scheduleAutoClear(5000);
      }
    };

    waitForReceipt();
  }, [trackedTransaction?.hash, trackedTransaction?.chainId, trackingStatus, scheduleAutoClear]);

  // ---- POLL FOR INDEXING ----

  useEffect(() => {
    if (trackingStatus !== "waiting" || trackedTransaction?.blockNumber == null) {
      return;
    }

    const poll = async () => {
      try {
        const indexed = await fetchLatestIndexedBlock();
        if (indexed && Number(indexed.blockNumber) >= trackedTransaction.blockNumber!) {
          showToast.success("Transaction indexed!", { duration: 3000 });
          setTrackingStatus("synced");

          const { publicKey, accountKey } = cryptoRef.current;

          if (publicKey && accountKey) {
            NotesDiscoveryController.refresh();
          }

          eventTargetRef.current.dispatchEvent(new CustomEvent("indexed"));

          scheduleAutoClear(10_000);
        }
      } catch (err) {
        logError(err, {
          action: "checkTransactionIndexed",
          suppressed: true,
        });
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [trackedTransaction?.blockNumber, trackingStatus, scheduleAutoClear]);

  // ---- CLEANUP ----

  useEffect(() => clearTracking, [clearTracking]);

  return (
    <TransactionTrackingContext.Provider
      value={{
        trackTransaction,
        onTransactionIndexed,
        trackingStatus,
        trackedTxHash: trackedTransaction?.hash ?? null,
        trackedChainId: trackedTransaction?.chainId ?? null,
      }}
    >
      {children}
    </TransactionTrackingContext.Provider>
  );
}
