import { proxy } from "valtio";
import { parseEther, formatEther, isAddress } from "viem/utils";
import type { Note, SpendableNote } from "@shinobi-cash/core/discovery";
import { selectNotesForWithdrawal, type WithdrawalSelection } from "@shinobi-cash/core/withdrawal";
import type { WithdrawalFeeQuote } from "@shinobi-cash/core/account";
import type { PreparedWithdrawalOp } from "@shinobi-cash/client";
import { POOL_CHAIN, FEE_CONFIG, INTENT_TIMING } from "@shinobi-cash/constants";
import { AuthController } from "@/controllers/AuthController";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";
import { getShinobiClient } from "@/runtime/ClientSingleton";
import { createStateMachine } from "@/utils/stateMachine";
import { type AppError, Errors, getUserMessage } from "@/lib/errors/errors";
import { PREVIEW_DEBOUNCE_MS } from "@/constants/timings";

type WithdrawState =
  | { status: "idle" }
  | { status: "previewing" }
  | { status: "preparing" }
  | { status: "ready"; prepared: PreparedWithdrawalOp }
  | { status: "submitting" }
  | { status: "confirming"; userOpHash: string }
  | { status: "confirmed"; txHash: `0x${string}` }
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
  previewFeeQuote: WithdrawalFeeQuote | null;
  lastError: AppError | null;
  notes: NotesContext;
  /** User-configurable solver fee in basis points (default from FEE_CONFIG) */
  solverFeeBPS: number;
  /** Fill deadline in seconds (cross-chain, fetched from contract) */
  fillDeadlineSeconds: number;
  /** Expiry in seconds (cross-chain, fetched from contract) */
  expirySeconds: number;
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
  solverFeeBPS: FEE_CONFIG.DEFAULT_SOLVER_FEE_BPS,
  fillDeadlineSeconds: INTENT_TIMING.FILL_DEADLINE_SECONDS,
  expirySeconds: INTENT_TIMING.EXPIRY_SECONDS,
});

export const WithdrawSelectors = {
  canWithdraw: () => {
    return (
      state.state.status === "idle" &&
      state.selectedNotes.length > 0 &&
      state.selection !== null &&
      state.amount.trim() !== "" &&
      state.recipientAddress.trim() !== "" &&
      isAddress(state.recipientAddress) &&
      AuthController.isAuthenticated()
    );
  },

  canAutoPreview: () => {
    return (
      state.amount.trim() !== "" &&
      state.recipientAddress.trim() !== "" &&
      state.selectedNotes.length > 0 &&
      isAddress(state.recipientAddress) &&
      AuthController.isAuthenticated()
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
        ? state.state.prepared.feeQuote
        : state.previewFeeQuote;
    if (!feeQuote) return 0;
    return parseFloat(formatEther(feeQuote.netAmountWei));
  },

  getExecutionFee: () => {
    const feeQuote =
      state.state.status === "ready"
        ? state.state.prepared.feeQuote
        : state.previewFeeQuote;
    if (!feeQuote) return 0;
    return parseFloat(formatEther(feeQuote.executionFeeWei));
  },

  getSolverFee: () => {
    const feeQuote =
      state.state.status === "ready"
        ? state.state.prepared.feeQuote
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
    submitting: ["confirming", "confirmed", "error"],
    confirming: ["confirmed", "error"],
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
    const chainChanged = state.destinationChainId !== chainId;
    state.destinationChainId = chainId;
    state.lastError = null;
    if (state.state.status === "error") transition({ status: "idle" });
    if (state.state.status === "ready") transition({ status: "idle" });
    if (chainChanged) {
      this._fetchWithdrawalChainConfig();
    }
  },

  selectNote(note: Note | null): void {
    state.selectedNotes = note ? [note] : [];
    state.selection = null;
    state.lastError = null;
    this._updateSelection();
    if (state.state.status === "error") transition({ status: "idle" });
    if (state.state.status === "ready") transition({ status: "idle" });
  },

  addNote(note: Note): void {
    if (state.selectedNotes.length >= 2) {
      state.lastError = Errors.withdrawal.precondition("Maximum 2 notes can be selected");
      return;
    }
    if (
      state.selectedNotes.some(
        (n) => n.depositIndex === note.depositIndex && n.changeIndex === note.changeIndex
      )
    ) {
      return;
    }
    state.selectedNotes = [...state.selectedNotes, note];
    state.selection = null;
    state.lastError = null;
    this._updateSelection();
    if (state.state.status === "error") transition({ status: "idle" });
    if (state.state.status === "ready") transition({ status: "idle" });
  },

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

  clearNotes(): void {
    state.selectedNotes = [];
    state.selection = null;
    state.lastError = null;
    if (state.state.status === "error") transition({ status: "idle" });
    if (state.state.status === "ready") transition({ status: "idle" });
  },

  setMax(): void {
    if (state.selectedNotes.length === 0) return;
    const totalAmountWei = state.selectedNotes.reduce(
      (sum, note) => sum + BigInt(note.amount),
      BigInt(0)
    );
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
      const client = getShinobiClient();
      const amountWei = parseEther(state.amount);

      const sdkQuote = this._isWithdraw2()
        ? await client.quoteWithdraw2({ amountWei, destinationChainId: state.destinationChainId })
        : await client.quoteWithdrawal({ amountWei, destinationChainId: state.destinationChainId });

      if (current !== previewId) return;
      state.previewFeeQuote = sdkQuote;
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
      return;
    }

    try {
      transition({ status: "preparing" });

      const client = getShinobiClient();
      const amountWei = parseEther(state.amount);
      const recipient = state.recipientAddress as `0x${string}`;

      let prepared: PreparedWithdrawalOp;
      if (this._isWithdraw2()) {
        const selection = state.selection!;
        if (selection.type !== "withdraw2") throw new Error("Invalid selection");
        prepared = await client.prepareWithdraw2({
          primaryNote: selection.primaryInput.note as SpendableNote,
          secondaryNote: selection.secondaryInput.note as SpendableNote,
          amountWei,
          recipient,
          destinationChainId: state.destinationChainId,
          labelSelector: selection.labelSelector,
        });
      } else {
        const selection = state.selection!;
        if (selection.type !== "standard") throw new Error("Invalid selection");
        prepared = await client.prepareWithdrawal({
          note: selection.input.note as SpendableNote,
          amountWei,
          recipient,
          destinationChainId: state.destinationChainId,
        });
      }

      if (current !== prepareId) return;

      transition({ status: "ready", prepared });
    } catch (error) {
      if (current !== prepareId) return;
      transition({ status: "error", error: Errors.withdrawal.proofFailed(error) });
    }
  },

  async confirm(): Promise<void> {
    await this.prepare();
    if (state.state.status !== "ready") return;
    await this.submit();
  },

  async submit(): Promise<void> {
    if (state.state.status !== "ready") return;

    const { prepared } = state.state;

    transition({ status: "submitting" });

    try {
      const client = getShinobiClient();
      const transactionHash = await client.submitWithdrawal(prepared, {
        onSubmitted: (userOpHash) => {
          transition({ status: "confirming", userOpHash });
        },
      });

      transition({
        status: "confirmed",
        txHash: transactionHash as `0x${string}`,
      });

      NotesDiscoveryController.refresh();
    } catch (error) {
      const userMessage = getUserMessage(error, "Withdrawal failed");
      transition({
        status: "error",
        error: Errors.withdrawal.transactionFailed(userMessage, error),
      });
    }
  },

  reset(): void {
    state.amount = "";
    state.recipientAddress = "";
    state.selectedNotes = [];
    state.selection = null;
    state.previewFeeQuote = null;
    state.lastError = null;
    state.solverFeeBPS = FEE_CONFIG.DEFAULT_SOLVER_FEE_BPS;
    state.fillDeadlineSeconds = INTENT_TIMING.FILL_DEADLINE_SECONDS;
    state.expirySeconds = INTENT_TIMING.EXPIRY_SECONDS;
    transition({ status: "idle" });
  },

  setSolverFeeBPS(feeBPS: number): void {
    state.solverFeeBPS = feeBPS;
    if (WithdrawSelectors.canAutoPreview()) {
      this.schedulePreview(0);
    }
  },

  async retry(): Promise<void> {
    if (state.state.status === "error") {
      await this.prepare();
    }
  },

  _updateNotes(notes: NotesContext): void {
    state.notes = notes;
  },

  async _fetchWithdrawalChainConfig(): Promise<void> {
    if (state.destinationChainId === POOL_CHAIN.id) return;

    try {
      const client = getShinobiClient();
      const quote = await client.getSolverQuote({
        originChainId: POOL_CHAIN.id,
        destinationChainId: state.destinationChainId,
        amountWei: "0",
        type: "withdrawal",
      });
      state.fillDeadlineSeconds = quote.fillDeadlineSeconds;
      state.expirySeconds = quote.expirySeconds;
    } catch (error) {
      console.warn("[WithdrawController] Failed to fetch withdrawal chain config:", error);
    }
  },

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

    if (!amount || !recipientAddress || selectedNotes.length === 0) return false;
    if (!AuthController.isAuthenticated()) return false;
    if (!isAddress(recipientAddress)) return false;

    if (!state.selection) {
      this._updateSelection();
    }

    if (!state.selection) {
      return false;
    }

    return true;
  },

  _isWithdraw2(): boolean {
    return state.selection?.type === "withdraw2";
  },
};
