/**
 * Withdraw Controller - Non-React singleton
 * Follows Auth & Deposit pattern: explicit state machine, imperative API, domain-driven
 *
 * CRITICAL: This controller embeds WithdrawalEngine (stateful orchestrator)
 * We do NOT rewrite withdrawal logic - we preserve it inside the engine
 */

import { proxy } from "valtio";
import { WithdrawalEngine, type EnginePhase } from "../engine/WithdrawalEngine";
import type {
  WithdrawalRequest,
  FeeQuote,
  PreparedUserOperation,
  ExecutionResult,
} from "../domain/types";
import { parseEther, formatEther, isAddress } from "viem";
import { Note } from "@shinobi-cash/core";
import { POOL_CHAIN } from "@shinobi-cash/constants";

/**
 * Withdraw error types
 */
export type WithdrawError =
  | { type: "precondition"; message: string } // Validation before operation
  | { type: "fees"; message: string } // Fee estimation failure
  | { type: "context"; message: string } // Context building failure
  | { type: "witness"; message: string } // Witness generation failure
  | { type: "proof"; message: string } // ZK proof generation failure
  | { type: "transaction"; message: string } // UserOp submission failure
  | { type: "confirmation"; message: string }; // Chain confirmation failure

/**
 * Explicit state machine (matches actual withdrawal flow)
 * Note: No "confirming" or "failed" states - bundler waits for UserOp receipt internally
 * UserOp failures throw errors and transition to "error" state
 */
type WithdrawState =
  | { status: "idle" }
  | { status: "previewing" } // Lightweight fee preview
  | { status: "preparing"; phase: EnginePhase } // Track engine phase during preparation
  | { status: "ready"; preparedUserOp: PreparedUserOperation }
  | { status: "submitting" } // Executing UserOp via bundler (includes confirmation wait)
  | { status: "confirmed"; txHash: `0x${string}`; executionResult: ExecutionResult }
  | { status: "error"; error: WithdrawError };

/**
 * Crypto context (from AccountService via useCryptoContext)
 * ONLY context needed for withdrawal (no wallet!)
 */
export interface CryptoContext {
  publicKey: string | null;
  accountKey: bigint | null;
  cryptoReady: boolean;
}

/**
 * Notes context (from useCachedNotes, read-only)
 */
export interface NotesContext {
  notes: Note[];
  isLoading: boolean;
}

/**
 * Full controller state (canonical truth only)
 */
interface WithdrawControllerState {
  // Core state machine
  state: WithdrawState;

  // Form inputs
  amount: string;
  recipientAddress: string;
  destinationChainId: number;
  selectedNote: Note | null;

  // Preview (lightweight, auto-updated)
  previewFeeQuote: FeeQuote | null;

  // Last error (informational, not blocking)
  lastError: WithdrawError | null;

  // External contexts (updated by React adapter)
  crypto: CryptoContext;
  notes: NotesContext; // Read-only, never mutated by controller
}

// ========== VALTIO STATE ==========

const state = proxy<WithdrawControllerState>({
  state: { status: "idle" },
  amount: "",
  recipientAddress: "",
  destinationChainId: POOL_CHAIN.id,
  selectedNote: null,
  previewFeeQuote: null,
  lastError: null,
  crypto: {
    publicKey: null,
    accountKey: null,
    cryptoReady: false,
  },
  notes: {
    notes: [],
    isLoading: false,
  },
});

// ========== SELECTORS ==========

export const WithdrawSelectors = {
  /**
   * Can user start withdrawal? (check before "Review" button)
   */
  canWithdraw: () => {
    return (
      state.state.status === "idle" &&
      state.selectedNote !== null &&
      state.amount.trim() !== "" &&
      state.recipientAddress.trim() !== "" &&
      isAddress(state.recipientAddress) &&
      state.crypto.cryptoReady // ← ONLY crypto check, NO wallet!
    );
  },

  /**
   * Should controller auto-preview fees?
   */
  canAutoPreview: () => {
    return (
      state.amount.trim() !== "" &&
      state.recipientAddress.trim() !== "" &&
      state.selectedNote !== null &&
      isAddress(state.recipientAddress) &&
      state.crypto.cryptoReady
    );
  },

  /**
   * Is this a cross-chain withdrawal?
   * CORRECTED: Defined by destinationChainId vs POOL_CHAIN_ID
   * NOT by note origin chain (notes are always pool notes)
   */
  isCrossChain: () => {
    return state.destinationChainId !== POOL_CHAIN.id;
  },

  /**
   * Is destination chain supported?
   */
  isOnSupportedChain: () => {
    // TODO: Implement chain support check
    return true;
  },

  /**
   * Get remaining balance after withdrawal
   * CORRECTED: Use BigInt math, format only for display
   */
  getRemainingBalance: () => {
    if (!state.selectedNote || !state.amount) return 0;

    try {
      const noteAmountWei = parseEther(state.selectedNote.amount.toString());
      const withdrawWei = parseEther(state.amount);
      const remainingWei = noteAmountWei > withdrawWei ? noteAmountWei - withdrawWei : BigInt(0);

      return parseFloat(formatEther(remainingWei));
    } catch {
      return 0;
    }
  },

  /**
   * Get net amount user receives (after fees)
   */
  getNetAmount: () => {
    // Use preview quote for display, authoritative quote from preparedUserOp when ready
    const feeQuote =
      state.state.status === "ready"
        ? state.state.preparedUserOp.context.feeQuote
        : state.previewFeeQuote;

    if (!feeQuote) return 0;

    return parseFloat(formatEther(feeQuote.netAmountWei));
  },

  /**
   * Get execution fee in ETH
   */
  getExecutionFee: () => {
    const feeQuote =
      state.state.status === "ready"
        ? state.state.preparedUserOp.context.feeQuote
        : state.previewFeeQuote;

    if (!feeQuote) return 0;

    return parseFloat(formatEther(feeQuote.executionFeeWei));
  },

  /**
   * Get solver fee in ETH
   */
  getSolverFee: () => {
    const feeQuote =
      state.state.status === "ready"
        ? state.state.preparedUserOp.context.feeQuote
        : state.previewFeeQuote;

    if (!feeQuote) return 0;

    return parseFloat(formatEther(feeQuote.solverFeeWei));
  },

  /**
   * Get "You Receive" amount (same as net amount)
   */
  getYouReceive: () => {
    return WithdrawSelectors.getNetAmount();
  },

  /**
   * Get address validation error if any
   */
  getAddressError: () => {
    if (!state.recipientAddress) return null;
    if (!isAddress(state.recipientAddress)) {
      return "Invalid Ethereum address";
    }
    return null;
  },
};

let engine: WithdrawalEngine | null = null;

function getEngine(): WithdrawalEngine {
  if (!engine) {
    engine = new WithdrawalEngine();
  }
  return engine;
}

function resetEngine(): void {
  engine?.reset();
  engine = null;
}

// ========== CONCURRENCY PROTECTION ==========

let prepareId = 0;
let previewId = 0; // Separate ID for preview
let previewTimeout: ReturnType<typeof setTimeout> | null = null;

// ========== STATE TRANSITION VALIDATION ==========

const allowedTransitions: Record<WithdrawState["status"], WithdrawState["status"][]> = {
  idle: ["previewing", "preparing"],
  previewing: ["idle", "preparing"], // Can transition to full prepare
  preparing: ["ready", "error"],
  ready: ["submitting", "preparing", "idle"], // Can re-prepare or reset
  submitting: ["confirmed", "error"], // Bundler confirms internally, goes directly to confirmed
  confirmed: [], // Terminal
  error: ["idle", "preparing"], // Can retry
};

function transition(next: WithdrawState) {
  const current = state.state.status;

  if (process.env.NODE_ENV !== "production") {
    if (!allowedTransitions[current].includes(next.status)) {
      console.warn(
        `[WithdrawController] Invalid transition: ${current} → ${next.status}`,
        "\nAllowed transitions from",
        current,
        ":",
        allowedTransitions[current]
      );
    }
  }

  log.debug("State transition:", current, "→", next.status);
  state.state = next;
}

// ========== LOGGING ==========

const log = {
  debug: (...args: unknown[]) => {
    console.debug("[WithdrawController]", ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn("[WithdrawController]", ...args);
  },
};

// ========== CONTROLLER ==========

export const WithdrawController = {
  state,

  // ================= LIFECYCLE =================

  /**
   * Set withdrawal amount
   */
  setAmount(amount: string): void {
    state.amount = amount;
    state.lastError = null; // Clear error on input change

    // Reset to idle if in error state
    if (state.state.status === "error") {
      transition({ status: "idle" });
    }

    // Invalidate prepared state (amount changed)
    if (state.state.status === "ready") {
      transition({ status: "idle" });
    }
  },

  /**
   * Set recipient address
   */
  setRecipientAddress(address: string): void {
    state.recipientAddress = address;
    state.lastError = null; // Clear error on input change

    // Basic validation (non-blocking)
    if (address && !isAddress(address)) {
      state.lastError = {
        type: "precondition",
        message: "Invalid recipient address",
      };
      return;
    }

    if (state.state.status === "error") {
      transition({ status: "idle" });
    }
  },

  /**
   * Set destination chain
   */
  setDestinationChain(chainId: number): void {
    state.destinationChainId = chainId;
    state.lastError = null;

    if (state.state.status === "error") {
      transition({ status: "idle" });
    }

    if (state.state.status === "ready") {
      transition({ status: "idle" });
    }
  },

  /**
   * Select note
   */
  selectNote(note: Note | null): void {
    state.selectedNote = note;
    state.lastError = null;

    if (state.state.status === "error") {
      transition({ status: "idle" });
    }

    if (state.state.status === "ready") {
      transition({ status: "idle" });
    }
  },

  /**
   * Set max amount (from selected note)
   */
  setMax(): void {
    if (!state.selectedNote) return;

    // Convert from wei string to ETH string for the input field
    const noteAmountWei = BigInt(state.selectedNote.amount);
    state.amount = formatEther(noteAmountWei);
    state.lastError = null;

    if (state.state.status === "ready") {
      transition({ status: "idle" });
    }
  },

  /**
   * Schedule lightweight fee preview (no proof generation)
   */
  schedulePreview(delay = 500): void {
    if (previewTimeout) clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => this.preview(), delay);
  },

  /**
   * Lightweight fee preview (cheap, no proof)
   */
  async preview(): Promise<void> {
    const current = ++previewId;

    if (!this._validateInputs()) {
      state.previewFeeQuote = null;
      return;
    }

    transition({ status: "previewing" });

    try {
      const request = this._buildRequest();

      // CRITICAL: Only quote fees (no proof generation)
      const feeQuote = await getEngine().quoteFees(request);

      if (current !== previewId) return;

      state.previewFeeQuote = feeQuote;
      transition({ status: "idle" });
    } catch (error) {
      if (current !== previewId) return;

      state.lastError = {
        type: "fees",
        message: error instanceof Error ? error.message : "Fee preview failed",
      };
      transition({ status: "idle" });
    }
  },

  /**
   * Full preparation (with proof generation)
   * CRITICAL: Uses getEngine().prepare() - preserves existing logic
   */
  async prepare(): Promise<void> {
    const current = ++prepareId;

    log.debug("prepare() started", { prepareId: current });

    // Validate preconditions
    if (!this._validateInputs()) {
      transition({
        status: "error",
        error: { type: "precondition", message: "Invalid inputs" },
      });
      resetEngine();
      return;
    }

    try {
      const request = this._buildRequest();

      // CRITICAL: Engine.prepare() contains all withdrawal logic
      // Track engine phase during preparation
      transition({ status: "preparing", phase: "idle" });

      // Call getEngine().prepare() - it runs all 5 stages internally
      // Engine phases: quoted → context-built → witness-built → proof-generated → prepared
      const preparedUserOp = await getEngine().prepare(request);

      if (current !== prepareId) return;

      transition({ status: "ready", preparedUserOp });
      log.debug("prepare() completed", { prepareId: current });
    } catch (error) {
      if (current !== prepareId) return;

      transition({
        status: "error",
        error: {
          type: "proof",
          message: error instanceof Error ? error.message : "Preparation failed",
        },
      });
      resetEngine();
    }
  },

  /**
   * Confirm withdrawal (prepare + submit)
   * INTERACTION CONTRACT FIX: All work happens on Confirm, not Review
   */
  async confirm(): Promise<void> {
    log.debug("confirm() started - full prepare + submit flow");

    // Stage 1-4: Full preparation (fees + context + witness + proof)
    await this.prepare();

    // Check if prepare succeeded
    if (state.state.status !== "ready") {
      log.debug("Confirm aborted: prepare failed", state.state.status);
      resetEngine();
      return;
    }

    // Stage 5-6: Submit transaction
    await this.submit();
  },

  /**
   * Submit prepared withdrawal
   * CRITICAL: Phase validation - must be in ready state
   * Note: UserOp receipt is already confirmed by bundler client before returning
   */
  async submit(): Promise<void> {
    // Must be in ready state
    if (state.state.status !== "ready") {
      log.warn("Cannot submit: not in ready state", state.state.status);
      resetEngine();
      return;
    }

    // NO wallet check - withdrawal uses Account Abstraction via smart account!
    // preparedUserOp contains smartAccountClient created from WITHDRAWAL_ACCOUNT_PRIVATE_KEY

    transition({ status: "submitting" });

    try {
      // Execute via engine - preserves existing execution logic
      // Bundler client waits for UserOperation receipt internally
      const currentEngine = getEngine();
      const result = await currentEngine.execute();

      if (!result?.transactionHash) {
        throw new Error("Transaction submission failed");
      }

      // UserOp already confirmed by bundler - transition directly to confirmed
      const engineState = currentEngine.getState();
      if (!engineState.executionResult) {
        throw new Error("Execution result missing after UserOp execution");
      }

      transition({
        status: "confirmed",
        txHash: result.transactionHash as `0x${string}`,
        executionResult: engineState.executionResult,
      });

      log.debug("Withdrawal confirmed", { txHash: result.transactionHash });
    } catch (error) {
      transition({
        status: "error",
        error: {
          type: "transaction",
          message: error instanceof Error ? error.message : "Submission failed",
        },
      });
      resetEngine();
    }
  },

  /**
   * Reset to idle state
   */
  reset(): void {
    state.amount = "";
    state.recipientAddress = "";
    state.selectedNote = null;
    state.previewFeeQuote = null;
    state.lastError = null;
    resetEngine();
    transition({ status: "idle" });
    log.debug("Controller reset");
  },

  /**
   * Retry after error
   */
  async retry(): Promise<void> {
    if (state.state.status === "error") {
      resetEngine();
      await this.prepare();
    }
  },

  // ================= CONTEXT UPDATES (called by React adapter) =================

  /**
   * Update crypto context from useCryptoContext
   */
  _updateCrypto(crypto: CryptoContext): void {
    state.crypto = crypto;
  },

  /**
   * Update notes context from useCachedNotes (read-only)
   */
  _updateNotes(notes: NotesContext): void {
    state.notes = notes;
  },

  // ================= PRIVATE HELPERS =================

  /**
   * Validate inputs (precondition checks)
   * NO wallet validation - withdrawal uses Account Abstraction!
   */
  _validateInputs(): boolean {
    const { amount, recipientAddress, selectedNote, crypto } = state;

    if (!amount || !recipientAddress || !selectedNote) return false;
    if (!crypto.cryptoReady || !crypto.accountKey) return false;
    if (!isAddress(recipientAddress)) return false;

    // Validate amount against note balance (BigInt math)
    try {
      const amountWei = parseEther(amount);
      const noteAmountWei = parseEther(selectedNote.amount.toString());
      if (amountWei > noteAmountWei) {
        state.lastError = {
          type: "precondition",
          message: `Amount exceeds note balance (${parseFloat(selectedNote.amount.toString()).toFixed(4)} ETH)`,
        };
        return false;
      }
    } catch {
      return false;
    }

    return true;
  },

  /**
   * Build withdrawal request from current state
   */
  _buildRequest(): WithdrawalRequest {
    return {
      note: state.selectedNote!,
      withdrawAmountWei: parseEther(state.amount),
      recipient: state.recipientAddress as `0x${string}`,
      accountKey: state.crypto.accountKey!,
      destinationChainId: state.destinationChainId,
    };
  },


};
