/**
 * Deposit Controller - Non-React singleton
 * Follows Auth pattern: explicit state machine, imperative API, domain-driven
 */

import { proxy } from "valtio";
import { depositService, type CashNoteData, type GasEstimate } from "../features/deposit/services/depositService";
import { formatDepositAmountsForDisplay } from "../features/deposit/protocol/depositFees";
import { isDepositSupported } from "../features/deposit/protocol/depositRoute";
import { DEPOSIT_FEES, POOL_CHAIN } from "@shinobi-cash/constants";
import type { PublicClient, WalletClient } from "viem";
import { AuthController } from "@/controllers/AuthController";

/**
 * Deposit error types
 */
export type DepositError =
  | { type: "precondition"; message: string } // Validation errors before operation starts
  | { type: "commitment"; message: string }
  | { type: "gas"; message: string }
  | { type: "transaction"; message: string }
  | { type: "tracking"; message: string };

/**
 * Deposit amounts (note amount + fees)
 */
export interface DepositAmounts {
  noteAmount: number;
  complianceFee: number;
  solverFee: number;
}

/**
 * Explicit state machine (Auth pattern)
 */
type DepositState =
  | { status: "idle" }
  | { status: "preparing"; step: "crypto" | "commitment" | "gas" }
  | { status: "ready"; amounts: DepositAmounts; gasEstimate: GasEstimate; noteData: CashNoteData }
  | { status: "submitting" }
  | { status: "confirming"; txHash: `0x${string}` }
  | { status: "confirmed-onchain"; txHash: `0x${string}` }
  | { status: "failed"; txHash: `0x${string}`; reason: string }
  | { status: "error"; error: DepositError };

/**
 * Wallet context (snapshot from React)
 */
export interface WalletContext {
  isConnected: boolean;
  address: string | undefined;
  chainId: number;
  balance: string;
  publicClient: PublicClient | undefined;
  walletClient: WalletClient | undefined;
  gasPrice: bigint | undefined;
}

/**
 * Full controller state (canonical truth only)
 */
interface DepositControllerState {
  // Core state machine
  state: DepositState;

  // Input
  amount: string;

  // External contexts (updated by React adapter)
  wallet: WalletContext;
}

const state = proxy<DepositControllerState>({
  state: { status: "idle" },
  amount: "",
  wallet: {
    isConnected: false,
    address: undefined,
    chainId: 1,
    balance: "0",
    publicClient: undefined,
    walletClient: undefined,
    gasPrice: undefined,
  },
});

/**
 * Selectors - Derived views from canonical state
 * Controllers own truth, selectors derive views
 */
export const DepositSelectors = {
  /**
   * Is deposit ready to review/submit? (already prepared with gas estimate)
   */
  canDeposit: () => state.state.status === "ready",

  /**
   * Should controller auto-prepare?
   * Policy for when preparation should be triggered
   */
  canAutoPrepare: () => {
    const crypto = AuthController.state.crypto;
    return (
      state.amount.trim() !== "" &&
      state.wallet.isConnected &&
      crypto.cryptoReady &&
      isDepositSupported(state.wallet.chainId)
    );
  },

  /**
   * Is this a cross-chain deposit?
   */
  isCrossChain: () => state.wallet.chainId !== POOL_CHAIN.id,

  /**
   * Is current chain supported for deposits?
   */
  isOnSupportedChain: () => isDepositSupported(state.wallet.chainId),
};

// Prepare concurrency protection
let prepareId = 0;

// Auto-prepare debounce timer
let prepareTimeout: ReturnType<typeof setTimeout> | null = null;

// Debug logging
const log = {
  debug: (...args: unknown[]) => {
    console.debug("[DepositController]", ...args);
  },
};

/**
 * State transition validation table
 * Defines valid transitions to catch bugs early
 */
const allowedTransitions: Record<DepositState["status"], DepositState["status"][]> = {
  idle: ["preparing"],
  preparing: ["ready", "error"],
  ready: ["submitting", "preparing", "idle"], // Can re-prepare when amount changes
  submitting: ["confirming", "error"],
  confirming: ["confirmed-onchain", "failed"],
  "confirmed-onchain": [], // Terminal state
  failed: ["preparing", "idle"], // Can retry
  error: ["idle", "preparing"], // Can retry
};

/**
 * State transition guard
 * Centralizes state mutations for logging and validation
 */
function transition(next: DepositState) {
  const current = state.state.status;
  const allowed = allowedTransitions[current];

  // Validate transition in development
  if (process.env.NODE_ENV !== "production") {
    if (!allowed.includes(next.status)) {
      console.warn(
        `[DepositController] Invalid transition: ${current} → ${next.status}`,
        "\nAllowed transitions from",
        current,
        ":",
        allowed
      );
    }
  }

  log.debug("State transition:", current, "→", next.status);
  state.state = next;
}

export const DepositController = {
  state,

  // ================= LIFECYCLE =================

  /**
   * Set deposit amount (input only, doesn't trigger prepare)
   */
  setAmount(amount: string) {
    state.amount = amount;

    // Reset to idle if amount changes while in error state
    if (state.state.status === "error" || state.state.status === "failed") {
      transition({ status: "idle" });
    }
  },

  /**
   * Schedule prepare with debounce
   * Controller owns timing, UI just expresses intent
   *
   * @param delay - Debounce delay in milliseconds (default: 1000ms)
   */
  schedulePrepare(delay = 1000) {
    // Clear existing timeout
    if (prepareTimeout) {
      clearTimeout(prepareTimeout);
    }

    // Schedule new prepare
    prepareTimeout = setTimeout(() => {
      this.prepare();
    }, delay);

    log.debug("Prepare scheduled", { delay });
  },

  /**
   * Prepare deposit flow
   * - Generate commitment
   * - Estimate gas
   * - Calculate amounts
   *
   * Uses retry logic for commitment generation (3 attempts)
   * Protected against concurrent calls
   */
  async prepare() {
    // Concurrency protection: only latest prepare() wins
    const current = ++prepareId;

    const { amount, wallet } = state;
    const crypto = AuthController.state.crypto;

    log.debug("prepare() started", { prepareId: current, amount });

    // Validation (precondition checks)
    if (!amount || !crypto.cryptoReady || !crypto.publicKey || !crypto.accountKey) {
      transition({
        status: "error",
        error: { type: "precondition", message: "Crypto context not ready" },
      });
      return;
    }

    if (!wallet.publicClient || !wallet.gasPrice) {
      transition({
        status: "error",
        error: { type: "precondition", message: "Network not ready" },
      });
      return;
    }

    // Step 1: Generate commitment with retry logic
    transition({ status: "preparing", step: "commitment" });

    let noteData: CashNoteData | null = null;
    let retries = 0;
    const MAX_RETRIES = 3;

    while (retries < MAX_RETRIES) {
      // Check if this prepare was superseded
      if (current !== prepareId) {
        log.debug("prepare() cancelled (superseded)", { prepareId: current });
        return;
      }

      try {
        noteData = await depositService.generateCommitment(crypto.accountKey, crypto.publicKey);
        break; // Success
      } catch (error) {
        retries++;
        if (retries >= MAX_RETRIES) {
          if (current !== prepareId) return; // Check before transition
          transition({
            status: "error",
            error: {
              type: "commitment",
              message: error instanceof Error ? error.message : "Failed to generate commitment",
            },
          });
          return;
        }
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!noteData) return; // Should never happen, but type safety

    // Check if superseded before continuing
    if (current !== prepareId) {
      log.debug("prepare() cancelled (superseded)", { prepareId: current });
      return;
    }

    // Step 2: Estimate gas
    transition({ status: "preparing", step: "gas" });

    let gasEstimate: GasEstimate;
    try {
      gasEstimate = await depositService.estimateGas(
        amount,
        noteData,
        wallet.chainId,
        wallet.publicClient,
        wallet.gasPrice
      );
    } catch (error) {
      if (current !== prepareId) return; // Check before transition
      transition({
        status: "error",
        error: {
          type: "gas",
          message: error instanceof Error ? error.message : "Gas estimation failed",
        },
      });
      return;
    }

    // Final check before transitioning to ready
    if (current !== prepareId) {
      log.debug("prepare() cancelled (superseded)", { prepareId: current });
      return;
    }

    // Step 3: Calculate amounts
    const amounts = formatDepositAmountsForDisplay(amount);
    const isCrossChain = wallet.chainId !== POOL_CHAIN.id;
    const solverFee = isCrossChain
      ? (parseFloat(amount) * DEPOSIT_FEES.DEFAULT_SOLVER_FEE_BPS) / 10_000
      : 0;

    // Update state to ready
    transition({
      status: "ready",
      amounts: {
        ...amounts,
        solverFee,
      },
      gasEstimate,
      noteData,
    });

    log.debug("prepare() completed", { prepareId: current });
  },

  /**
   * Submit deposit transaction
   * - Write contract
   * - Track transaction
   * - Update state on hash/confirmation
   */
  async submit() {
    if (state.state.status !== "ready") {
      log.debug("Cannot submit: not in ready state", state.state.status);
      return;
    }

    const { noteData } = state.state;
    const { amount, wallet } = state;

    if (!wallet.walletClient) {
      transition({
        status: "error",
        error: { type: "transaction", message: "Wallet not connected" },
      });
      return;
    }

    transition({ status: "submitting" });

    try {
      // Submit transaction
      const txHash = await depositService.submitTransaction(
        amount,
        noteData,
        wallet.chainId,
        wallet.walletClient
      );

      // Update to confirming state
      transition({ status: "confirming", txHash });

      log.debug("Transaction submitted", { txHash });

      // Track transaction (async, don't await)
      this._trackTransaction(txHash);
    } catch (error) {
      transition({
        status: "error",
        error: {
          type: "transaction",
          message: error instanceof Error ? error.message : "Transaction failed",
        },
      });
    }
  },

  /**
   * Reset to idle state
   * Clears amount and resets state machine
   */
  reset() {
    state.amount = "";
    transition({ status: "idle" });
    log.debug("Controller reset");
  },

  /**
   * Retry after error or failed transaction
   * Attempts to prepare again with preserved amount
   */
  async retry() {
    if (state.state.status === "error" || state.state.status === "failed") {
      log.debug("Retrying after error/failure");
      await this.prepare();
    }
  },

  // ================= CONTEXT UPDATES (called by React adapter) =================

  /**
   * Update wallet context from React/Wagmi
   * Called by useDepositControllerSnapshot
   */
  _updateWallet(wallet: WalletContext) {
    state.wallet = wallet;
  },

  // ================= PRIVATE =================

  /**
   * Track transaction status
   * Controller owns on-chain confirmation
   * UI can use separate indexer tracking for privacy indexing
   */
  async _trackTransaction(txHash: `0x${string}`) {
    const { wallet } = state;

    if (!wallet.publicClient) {
      transition({
        status: "error",
        error: { type: "tracking", message: "Public client not available" },
      });
      return;
    }

    await depositService.trackTransaction(txHash, wallet.publicClient, (status, reason) => {
      if (status === "confirmed") {
        transition({ status: "confirmed-onchain", txHash });
        log.debug("Transaction confirmed on-chain", { txHash });
      } else if (status === "failed") {
        transition({ status: "failed", txHash, reason: reason ?? "Unknown error" });
        log.debug("Transaction failed on-chain", { txHash, reason });
      }
    });
  },
};
