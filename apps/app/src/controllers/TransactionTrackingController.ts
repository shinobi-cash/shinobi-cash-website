import { proxy } from "valtio";
import { getPublicClient } from "@/lib/clients";
import { showToast } from "@/lib/toast";
import { fetchLatestIndexedBlock } from "@/utils/indexer";
import { logError } from "@/lib/errors/errors";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";

export type TrackingStatus = "idle" | "pending" | "waiting" | "synced" | "failed";

interface TransactionInfo {
  hash: string;
  chainId: number;
  blockNumber: number | null;
}

interface TransactionTrackingState {
  status: TrackingStatus;
  transaction: TransactionInfo | null;
}

const state = proxy<TransactionTrackingState>({
  status: "idle",
  transaction: null,
});

// Timers
let autoClearTimeout: ReturnType<typeof setTimeout> | null = null;
let pollingInterval: ReturnType<typeof setInterval> | null = null;

// Event target for indexed callbacks
const eventTarget = new EventTarget();

/**
 * Clear all tracking state and timers
 */
function clearTracking() {
  if (autoClearTimeout) {
    clearTimeout(autoClearTimeout);
    autoClearTimeout = null;
  }
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  state.transaction = null;
  state.status = "idle";
}

/**
 * Schedule auto-clear after specified delay
 */
function scheduleAutoClear(ms: number = 5 * 60 * 1000) {
  if (autoClearTimeout) clearTimeout(autoClearTimeout);
  autoClearTimeout = setTimeout(clearTracking, ms);
}

/**
 * Wait for transaction receipt and transition to waiting state
 */
async function waitForReceipt(txHash: string, chainId: number) {
  try {
    const client = getPublicClient(chainId);
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      timeout: 60_000,
    });

    const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;

    if (receipt.status === "success") {
      showToast.success(`${shortHash} • Transaction successful! Indexing...`, {
        duration: 4000,
      });

      state.transaction = {
        hash: txHash,
        chainId,
        blockNumber: Number(receipt.blockNumber),
      };
      state.status = "waiting";

      // Start polling for indexing
      startIndexingPoll();
    } else {
      showToast.error(`${shortHash} • Transaction failed`, {
        duration: 5000,
      });
      state.status = "failed";
      scheduleAutoClear(5000);
    }
  } catch (error) {
    showToast.handleError(error, {
      action: "Transaction",
      fallbackMessage: "Transaction timeout",
    });
    state.status = "failed";
    scheduleAutoClear(5000);
  }
}

/**
 * Poll for indexer to catch up to transaction block
 */
function startIndexingPoll() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  const poll = async () => {
    if (state.status !== "waiting" || state.transaction?.blockNumber == null) {
      return;
    }

    try {
      const indexed = await fetchLatestIndexedBlock();
      if (indexed && Number(indexed.blockNumber) >= state.transaction.blockNumber) {
        showToast.success("Transaction indexed!", { duration: 3000 });
        state.status = "synced";

        // Trigger notes refresh
        NotesDiscoveryController.refresh();

        // Dispatch indexed event
        eventTarget.dispatchEvent(new CustomEvent("indexed"));

        scheduleAutoClear(10_000);

        // Stop polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
      }
    } catch (err) {
      logError(err, {
        action: "checkTransactionIndexed",
        suppressed: true,
      });
    }
  };

  // Initial poll
  poll();

  // Continue polling every 5 seconds
  pollingInterval = setInterval(poll, 5000);
}

export const TransactionTrackingController = {
  state,

  /**
   * Start tracking a transaction
   */
  trackTransaction(txHash: string, chainId: number) {
    clearTracking();

    const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
    showToast.success(`${shortHash} • Confirming transaction...`, {
      duration: 3000,
    });

    state.transaction = { hash: txHash, chainId, blockNumber: null };
    state.status = "pending";

    scheduleAutoClear();

    // Start waiting for receipt
    waitForReceipt(txHash, chainId);
  },

  /**
   * Register callback for when transaction is indexed
   * Returns cleanup function
   */
  onTransactionIndexed(callback: () => void): () => void {
    const handler = () => callback();
    eventTarget.addEventListener("indexed", handler);
    return () => {
      eventTarget.removeEventListener("indexed", handler);
    };
  },

  /**
   * Reset tracking state
   */
  reset() {
    clearTracking();
  },

  /**
   * Selectors for common state checks
   */
  get trackedTxHash(): string | null {
    return state.transaction?.hash ?? null;
  },

  get trackedChainId(): number | null {
    return state.transaction?.chainId ?? null;
  },

  get trackingStatus(): TrackingStatus {
    return state.status;
  },
};
