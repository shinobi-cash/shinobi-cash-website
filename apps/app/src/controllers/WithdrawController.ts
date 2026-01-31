import { proxy } from "valtio";
import { parseEther, formatEther, isAddress } from "viem/utils";
import type { Note } from "@shinobi-cash/core/discovery";
import type { FeeQuote, WithdrawalRequest } from "@/types/withdrawal";
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

interface WithdrawControllerState {
  state: WithdrawState;
  amount: string;
  recipientAddress: string;
  destinationChainId: number;
  selectedNote: Note | null;
  previewFeeQuote: FeeQuote | null;
  lastError: AppError | null;
  notes: NotesContext;
}

const state = proxy<WithdrawControllerState>({
  state: { status: "idle" },
  amount: "",
  recipientAddress: "",
  destinationChainId: POOL_CHAIN.id,
  selectedNote: null,
  previewFeeQuote: null,
  lastError: null,
  notes: { notes: [], isLoading: false },
});

export const WithdrawSelectors = {
  canWithdraw: () => {
    const crypto = AuthController.state.crypto;
    return (
      state.state.status === "idle" &&
      state.selectedNote !== null &&
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
      state.selectedNote !== null &&
      isAddress(state.recipientAddress) &&
      crypto.cryptoReady
    );
  },

  isCrossChain: () => state.destinationChainId !== POOL_CHAIN.id,

  isOnSupportedChain: () => true,

  getRemainingBalance: (): number | null => {
    if (!state.selectedNote || !state.amount) return null;
    try {
      const noteAmountWei = parseEther(state.selectedNote.amount.toString());
      const withdrawWei = parseEther(state.amount);
      const remainingWei = noteAmountWei > withdrawWei ? noteAmountWei - withdrawWei : BigInt(0);
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

  selectNote(note: Note | null): void {
    state.selectedNote = note;
    state.lastError = null;
    if (state.state.status === "error") transition({ status: "idle" });
    if (state.state.status === "ready") transition({ status: "idle" });
  },

  setMax(): void {
    if (!state.selectedNote) return;
    const noteAmountWei = BigInt(state.selectedNote.amount);
    state.amount = formatEther(noteAmountWei);
    state.lastError = null;
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
      const request = this._buildRequest();
      // Use fresh engine for preview (stateless quote)
      const previewEngine = new WithdrawalEngine();
      const feeQuote = await previewEngine.quoteFees(request);
      if (current !== previewId) return;
      state.previewFeeQuote = feeQuote;
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
      const request = this._buildRequest();
      transition({ status: "preparing", phase: "idle" });
      // Create fresh engine for this withdrawal flow
      currentEngine = new WithdrawalEngine();
      const preparedUserOp = await currentEngine.prepare(request);
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
    state.selectedNote = null;
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

  _validateInputs(): boolean {
    const { amount, recipientAddress, selectedNote } = state;
    const crypto = AuthController.state.crypto;

    if (!amount || !recipientAddress || !selectedNote) return false;
    if (!crypto.cryptoReady || !crypto.accountKey) return false;
    if (!isAddress(recipientAddress)) return false;

    try {
      const amountWei = parseEther(amount);
      const noteAmountWei = parseEther(selectedNote.amount.toString());
      if (amountWei > noteAmountWei) {
        state.lastError = Errors.withdrawal.insufficientBalance(
          `Amount exceeds note balance (${parseFloat(selectedNote.amount.toString()).toFixed(4)} ETH)`
        );
        return false;
      }
    } catch {
      return false;
    }

    return true;
  },

  _buildRequest(): WithdrawalRequest {
    const crypto = AuthController.state.crypto;
    return {
      note: state.selectedNote!,
      withdrawAmountWei: parseEther(state.amount),
      recipient: state.recipientAddress as `0x${string}`,
      accountKey: crypto.accountKey!,
      destinationChainId: state.destinationChainId,
    };
  },
};
