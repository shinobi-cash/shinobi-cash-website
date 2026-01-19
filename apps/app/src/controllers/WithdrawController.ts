import { proxy } from "valtio";
import { parseEther, formatEther, isAddress } from "viem";
import { Note } from "@shinobi-cash/core";
import { POOL_CHAIN } from "@shinobi-cash/constants";
import { AuthController } from "@/controllers/AuthController";
import { EnginePhase, WithdrawalEngine } from "@/services/WithdrawalOrchestratorService";
import {
  ExecutionResult,
  FeeQuote,
  PreparedUserOperation,
  WithdrawalRequest,
} from "@/types/withdrawal";
import { type AppError, Errors, getUserMessage } from "@/lib/errors/errors";

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

let engine: WithdrawalEngine | null = null;

function getEngine(): WithdrawalEngine {
  if (!engine) engine = new WithdrawalEngine();
  return engine;
}

function resetEngine(): void {
  engine?.reset();
  engine = null;
}

let prepareId = 0;
let previewId = 0;
let previewTimeout: ReturnType<typeof setTimeout> | null = null;

const allowedTransitions: Record<WithdrawState["status"], WithdrawState["status"][]> = {
  idle: ["previewing", "preparing"],
  previewing: ["idle", "preparing"],
  preparing: ["ready", "error"],
  ready: ["submitting", "preparing", "idle"],
  submitting: ["confirmed", "error"],
  confirmed: ["idle"],
  error: ["idle", "preparing"],
};

function transition(next: WithdrawState) {
  const current = state.state.status;
  if (process.env.NODE_ENV !== "production" && !allowedTransitions[current].includes(next.status)) {
    console.warn(`[WithdrawController] Invalid transition: ${current} → ${next.status}`);
  }
  state.state = next;
}

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

  schedulePreview(delay = 500): void {
    if (previewTimeout) clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => this.preview(), delay);
  },

  async preview(): Promise<void> {
    const current = ++previewId;
    if (!this._validateInputs()) {
      state.previewFeeQuote = null;
      return;
    }

    transition({ status: "previewing" });

    try {
      const request = this._buildRequest();
      const feeQuote = await getEngine().quoteFees(request);
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
      resetEngine();
      return;
    }

    try {
      const request = this._buildRequest();
      transition({ status: "preparing", phase: "idle" });
      const preparedUserOp = await getEngine().prepare(request);
      if (current !== prepareId) return;
      transition({ status: "ready", preparedUserOp });
    } catch (error) {
      if (current !== prepareId) return;
      transition({ status: "error", error: Errors.withdrawal.proofFailed(error) });
      resetEngine();
    }
  },

  async confirm(): Promise<void> {
    await this.prepare();
    if (state.state.status !== "ready") {
      resetEngine();
      return;
    }
    await this.submit();
  },

  async submit(): Promise<void> {
    if (state.state.status !== "ready") {
      resetEngine();
      return;
    }

    transition({ status: "submitting" });

    try {
      const currentEngine = getEngine();
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
    } catch (error) {
      const userMessage = getUserMessage(error, "Withdrawal failed");
      transition({
        status: "error",
        error: Errors.withdrawal.transactionFailed(userMessage, error),
      });
      resetEngine();
    }
  },

  reset(): void {
    state.amount = "";
    state.recipientAddress = "";
    state.selectedNote = null;
    state.previewFeeQuote = null;
    state.lastError = null;
    resetEngine();
    transition({ status: "idle" });
  },

  async retry(): Promise<void> {
    if (state.state.status === "error") {
      resetEngine();
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
