import { proxy } from "valtio";
import { parseEther, formatEther, isAddress } from "viem/utils";
import type { Note } from "@shinobi-cash/core/discovery";
import {
  selectNotesForWithdrawal,
  isWithdraw2Selection,
  type WithdrawalSelection,
} from "@shinobi-cash/core/withdrawal";
import type { FeeQuote, WithdrawalRequest, Withdraw2Request } from "@/types/withdrawal";
import { POOL_CHAIN } from "@shinobi-cash/constants";
import { AuthController } from "@/controllers/AuthController";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";
import { EnginePhase, WithdrawalEngine } from "@/services/WithdrawalOrchestratorService";
import { createStateMachine } from "@/utils/stateMachine";
import { ExecutionResult, PreparedUserOperation } from "@/types/withdrawal";
import { type AppError, Errors, getUserMessage } from "@/lib/errors/errors";
import { PREVIEW_DEBOUNCE_MS } from "@/constants/timings";

type WithdrawState =
  | { status: "idle" }
  | { status: "previewing" }
  | { status: "preparing"; phase: EnginePhase }
  | { status: "ready"; preparedUserOp: PreparedUserOperation }
  | { status: "submitting" }
  | { status: "confirmed"; txHash: `0x${string}`; executionResult: ExecutionResult }
  | { status: "error"; error: AppError };

export interface NotesContext {
  notes: Note[];
  isLoading: boolean;
}

/** Withdrawal type determined by note selection */
export type WithdrawalMode = "standard" | "withdraw2";

interface WithdrawControllerState {
  state: WithdrawState;
  amount: string;
  recipientAddress: string;
  destinationChainId: number;
  /** Selected notes (1 for standard, 2 for withdraw2) */
  selectedNotes: Note[];
  /** Computed withdrawal selection result */
  selection: WithdrawalSelection | null;
  previewFeeQuote: FeeQuote | null;
  lastError: AppError | null;
  notes: NotesContext;
}

const state = proxy<WithdrawControllerState>({
  state: { status: "idle" },
  amount: "",
  recipientAddress: "",
  destinationChainId: POOL_CHAIN.id,
  selectedNotes: [],
  selection: null,
  previewFeeQuote: null,
  lastError: null,
  notes: { notes: [], isLoading: false },
});

export const WithdrawSelectors = {
  canWithdraw: () => {
    const crypto = AuthController.state.crypto;
    return (
      state.state.status === "idle" &&
      state.selectedNotes.length > 0 &&
      state.selection !== null &&
      state.amount.trim() !== "" &&
      state.recipientAddress.trim() !== "" &&
      isAddress(state.recipientAddress) &&
      crypto.cryptoReady
    );
  },

  canAutoPreview: () => {
    const crypto = AuthController.state.crypto;
    return (
      state.amount.trim() !== "" &&
      state.recipientAddress.trim() !== "" &&
      state.selectedNotes.length > 0 &&
      isAddress(state.recipientAddress) &&
      crypto.cryptoReady
    );
  },

  isCrossChain: () => state.destinationChainId !== POOL_CHAIN.id,

  isOnSupportedChain: () => true,

  /** Get the withdrawal mode based on selection */
  getWithdrawalMode: (): WithdrawalMode | null => {
    if (!state.selection) return null;
    return state.selection.type === "withdraw2" ? "withdraw2" : "standard";
  },

  /** Check if this is a Withdraw2 (2:1 merge) */
  isWithdraw2: () => state.selection?.type === "withdraw2",

  /** Get total input amount from selected notes */
  getTotalInputAmount: (): bigint => {
    return state.selectedNotes.reduce((sum, note) => sum + BigInt(note.amount), BigInt(0));
  },

  /** Get the primary selected note (for display) */
  getPrimaryNote: (): Note | null => {
    if (state.selectedNotes.length === 0) return null;
    if (state.selection?.type === "withdraw2") {
      return state.selection.primaryInput.note;
    }
    return state.selectedNotes[0] ?? null;
  },

  /** Get the secondary selected note (for Withdraw2) */
  getSecondaryNote: (): Note | null => {
    if (state.selection?.type === "withdraw2") {
      return state.selection.secondaryInput.note;
    }
    return null;
  },

  /** Legacy getter for backward compatibility */
  get selectedNote(): Note | null {
    return WithdrawSelectors.getPrimaryNote();
  },

  getRemainingBalance: (): number | null => {
    if (state.selectedNotes.length === 0 || !state.amount) return null;
    try {
      const totalAmountWei = WithdrawSelectors.getTotalInputAmount();
      const withdrawWei = parseEther(state.amount);
      const remainingWei = totalAmountWei > withdrawWei ? totalAmountWei - withdrawWei : BigInt(0);
      return parseFloat(formatEther(remainingWei));
    } catch {
      return null;
    }
  },

  getNetAmount: () => {
    const feeQuote =
      state.state.status === "ready"
        ? state.state.preparedUserOp.context.feeQuote
        : state.previewFeeQuote;
    if (!feeQuote) return 0;
    return parseFloat(formatEther(feeQuote.netAmountWei));
  },

  getExecutionFee: () => {
    const feeQuote =
      state.state.status === "ready"
        ? state.state.preparedUserOp.context.feeQuote
        : state.previewFeeQuote;
    if (!feeQuote) return 0;
    return parseFloat(formatEther(feeQuote.executionFeeWei));
  },

  getSolverFee: () => {
    const feeQuote =
      state.state.status === "ready"
        ? state.state.preparedUserOp.context.feeQuote
        : state.previewFeeQuote;
    if (!feeQuote) return 0;
    return parseFloat(formatEther(feeQuote.solverFeeWei));
  },

  getYouReceive: () => WithdrawSelectors.getNetAmount(),

  getAddressError: () => {
    if (!state.recipientAddress) return null;
    if (!isAddress(state.recipientAddress)) return "Invalid Ethereum address";
    return null;
  },
};

// Engine instance for current withdrawal flow
// Created fresh for each prepare() call, used by submit()
let currentEngine: WithdrawalEngine | null = null;

let prepareId = 0;
let previewId = 0;
let previewTimeout: ReturnType<typeof setTimeout> | null = null;

const { transition } = createStateMachine<WithdrawState>({
  name: "WithdrawController",
  allowedTransitions: {
    idle: ["previewing", "preparing"],
    previewing: ["idle", "preparing"],
    preparing: ["ready", "error"],
    ready: ["submitting", "preparing", "idle"],
    submitting: ["confirmed", "error"],
    confirmed: ["idle"],
    error: ["idle", "preparing"],
  },
  getState: () => state.state,
  setState: (next) => {
    state.state = next;
  },
});

export const WithdrawController = {
  state,

  setAmount(amount: string): void {
    state.amount = amount;
    state.lastError = null;
    this._updateSelection();
    if (state.state.status === "error") transition({ status: "idle" });
    if (state.state.status === "ready") transition({ status: "idle" });
  },

  setRecipientAddress(address: string): void {
    state.recipientAddress = address;
    state.lastError = null;
    if (address && !isAddress(address)) {
      state.lastError = Errors.withdrawal.invalidRecipient();
      return;
    }
    if (state.state.status === "error") transition({ status: "idle" });
  },

  setDestinationChain(chainId: number): void {
    state.destinationChainId = chainId;
    state.lastError = null;
    if (state.state.status === "error") transition({ status: "idle" });
    if (state.state.status === "ready") transition({ status: "idle" });
  },

  /**
   * Select a single note for withdrawal (replaces any existing selection)
   */
  selectNote(note: Note | null): void {
    state.selectedNotes = note ? [note] : [];
    state.selection = null;
    state.lastError = null;
    this._updateSelection();
    if (state.state.status === "error") transition({ status: "idle" });
    if (state.state.status === "ready") transition({ status: "idle" });
  },

  /**
   * Add a note to selection for Withdraw2 (max 2 notes)
   */
  addNote(note: Note): void {
    if (state.selectedNotes.length >= 2) {
      state.lastError = Errors.withdrawal.precondition("Maximum 2 notes can be selected");
      return;
    }
    // Don't add duplicate
    if (state.selectedNotes.some((n) => n.depositIndex === note.depositIndex && n.changeIndex === note.changeIndex)) {
      return;
    }
    state.selectedNotes = [...state.selectedNotes, note];
    state.selection = null;
    state.lastError = null;
    this._updateSelection();
    if (state.state.status === "error") transition({ status: "idle" });
    if (state.state.status === "ready") transition({ status: "idle" });
  },

  /**
   * Remove a note from selection
   */
  removeNote(note: Note): void {
    state.selectedNotes = state.selectedNotes.filter(
      (n) => !(n.depositIndex === note.depositIndex && n.changeIndex === note.changeIndex)
    );
    state.selection = null;
    state.lastError = null;
    this._updateSelection();
    if (state.state.status === "error") transition({ status: "idle" });
    if (state.state.status === "ready") transition({ status: "idle" });
  },

  /**
   * Clear all selected notes
   */
  clearNotes(): void {
    state.selectedNotes = [];
    state.selection = null;
    state.lastError = null;
    if (state.state.status === "error") transition({ status: "idle" });
    if (state.state.status === "ready") transition({ status: "idle" });
  },

  setMax(): void {
    if (state.selectedNotes.length === 0) return;
    const totalAmountWei = state.selectedNotes.reduce((sum, note) => sum + BigInt(note.amount), BigInt(0));
    state.amount = formatEther(totalAmountWei);
    state.lastError = null;
    this._updateSelection();
    if (state.state.status === "ready") transition({ status: "idle" });
  },

  schedulePreview(delay = PREVIEW_DEBOUNCE_MS): void {
    if (previewTimeout) clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => this.preview(), delay);
  },

  async preview(): Promise<void> {
    const current = ++previewId;
    if (!this._validateInputs()) {
      if (current === previewId) {
        state.previewFeeQuote = null;
        if (state.state.status === "previewing") {
          transition({ status: "idle" });
        }
      }
      return;
    }

    transition({ status: "previewing" });

    try {
      // Use fresh engine for preview (stateless quote)
      const previewEngine = new WithdrawalEngine();

      // Route based on withdrawal type
      if (this._isWithdraw2()) {
        const request = this._buildWithdraw2Request();
        const feeQuote = await previewEngine.quoteWithdraw2Fees(request);
        if (current !== previewId) return;
        state.previewFeeQuote = feeQuote;
      } else {
        const request = this._buildRequest();
        const feeQuote = await previewEngine.quoteFees(request);
        if (current !== previewId) return;
        state.previewFeeQuote = feeQuote;
      }

      transition({ status: "idle" });
    } catch (error) {
      if (current !== previewId) return;
      state.lastError = Errors.withdrawal.feeEstimationFailed(error);
      transition({ status: "idle" });
    }
  },

  async prepare(): Promise<void> {
    const current = ++prepareId;

    if (!this._validateInputs()) {
      transition({ status: "error", error: Errors.withdrawal.precondition("Invalid inputs") });
      currentEngine = null;
      return;
    }

    try {
      transition({ status: "preparing", phase: "idle" });
      // Create fresh engine for this withdrawal flow
      currentEngine = new WithdrawalEngine();

      // Route based on withdrawal type
      let preparedUserOp;
      if (this._isWithdraw2()) {
        const request = this._buildWithdraw2Request();
        preparedUserOp = await currentEngine.prepareWithdraw2(request);
      } else {
        const request = this._buildRequest();
        preparedUserOp = await currentEngine.prepare(request);
      }

      if (current !== prepareId) return;
      transition({ status: "ready", preparedUserOp });
    } catch (error) {
      if (current !== prepareId) return;
      transition({ status: "error", error: Errors.withdrawal.proofFailed(error) });
      currentEngine = null;
    }
  },

  async confirm(): Promise<void> {
    await this.prepare();
    if (state.state.status !== "ready") {
      currentEngine = null;
      return;
    }
    await this.submit();
  },

  async submit(): Promise<void> {
    if (state.state.status !== "ready" || !currentEngine) {
      currentEngine = null;
      return;
    }

    transition({ status: "submitting" });

    try {
      const result = await currentEngine.execute();

      if (!result?.transactionHash) {
        throw new Error("Transaction submission failed");
      }

      const engineState = currentEngine.getState();
      if (!engineState.executionResult) {
        throw new Error("Execution result missing");
      }

      transition({
        status: "confirmed",
        txHash: result.transactionHash as `0x${string}`,
        executionResult: engineState.executionResult,
      });

      // Trigger notes refresh - background sync will handle indexer catching up
      NotesDiscoveryController.refresh();
    } catch (error) {
      const userMessage = getUserMessage(error, "Withdrawal failed");
      transition({
        status: "error",
        error: Errors.withdrawal.transactionFailed(userMessage, error),
      });
      currentEngine = null;
    }
  },

  reset(): void {
    state.amount = "";
    state.recipientAddress = "";
    state.selectedNotes = [];
    state.selection = null;
    state.previewFeeQuote = null;
    state.lastError = null;
    currentEngine = null;
    transition({ status: "idle" });
  },

  async retry(): Promise<void> {
    if (state.state.status === "error") {
      currentEngine = null;
      await this.prepare();
    }
  },

  _updateNotes(notes: NotesContext): void {
    state.notes = notes;
  },

  /**
   * Update the selection based on current notes and amount
   */
  _updateSelection(): void {
    if (state.selectedNotes.length === 0 || !state.amount) {
      state.selection = null;
      return;
    }

    try {
      const withdrawAmountWei = parseEther(state.amount);
      const result = selectNotesForWithdrawal(state.selectedNotes, withdrawAmountWei);

      if (result.success) {
        state.selection = result.selection;
        state.lastError = null;
      } else {
        state.selection = null;
        // Map selection error to AppError
        switch (result.error.code) {
          case "INSUFFICIENT_BALANCE":
            state.lastError = Errors.withdrawal.insufficientBalance(result.error.message);
            break;
          case "NOTE_NOT_SPENDABLE":
            state.lastError = Errors.withdrawal.precondition(result.error.message);
            break;
          default:
            state.lastError = Errors.withdrawal.precondition(result.error.message);
        }
      }
    } catch {
      state.selection = null;
    }
  },

  _validateInputs(): boolean {
    const { amount, recipientAddress, selectedNotes } = state;
    const crypto = AuthController.state.crypto;

    if (!amount || !recipientAddress || selectedNotes.length === 0) return false;
    if (!crypto.cryptoReady || !crypto.accountKey) return false;
    if (!isAddress(recipientAddress)) return false;

    // Update selection if not already done
    if (!state.selection) {
      this._updateSelection();
    }

    // Check selection is valid
    if (!state.selection) {
      return false;
    }

    return true;
  },

  /**
   * Build request for standard 1:1 withdrawal
   */
  _buildRequest(): WithdrawalRequest {
    const crypto = AuthController.state.crypto;
    const selection = state.selection;

    if (!selection || selection.type !== "standard") {
      throw new Error("Invalid selection for standard withdrawal");
    }

    return {
      note: selection.input.note,
      withdrawAmountWei: selection.withdrawAmount,
      recipient: state.recipientAddress as `0x${string}`,
      accountKey: crypto.accountKey!,
      destinationChainId: state.destinationChainId,
    };
  },

  /**
   * Build request for Withdraw2 (2:1 merge)
   */
  _buildWithdraw2Request(): Withdraw2Request {
    const crypto = AuthController.state.crypto;
    const selection = state.selection;

    if (!selection || selection.type !== "withdraw2") {
      throw new Error("Invalid selection for withdraw2");
    }

    return {
      primaryNote: selection.primaryInput.note,
      secondaryNote: selection.secondaryInput.note,
      withdrawAmountWei: selection.withdrawAmount,
      recipient: state.recipientAddress as `0x${string}`,
      accountKey: crypto.accountKey!,
      destinationChainId: state.destinationChainId,
      labelSelector: selection.labelSelector,
    };
  },

  /**
   * Check if current selection requires Withdraw2
   */
  _isWithdraw2(): boolean {
    return state.selection?.type === "withdraw2";
  },
};
