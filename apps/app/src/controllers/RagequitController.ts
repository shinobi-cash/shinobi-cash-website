/**
 * RagequitController - State machine for emergency exit flow
 *
 * Ragequit allows users to withdraw their funds publicly without ASP approval.
 * The user pays gas directly (no bundler/paymaster).
 */

import { proxy } from "valtio";
import type { Note } from "@shinobi-cash/core/discovery";
import type { ContractRagequitProof } from "@shinobi-cash/core/withdrawal";
import { AuthController } from "@/controllers/AuthController";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";
import { RagequitEngine, type RagequitPhase } from "@/services/RagequitEngine";
import { createStateMachine } from "@/utils/stateMachine";
import { type AppError, Errors, getUserMessage } from "@/lib/errors/errors";
import { canRagequit } from "@/utils/noteFiltering";
import type { WalletClient, Account, Transport, Chain } from "viem";

type RagequitState =
  | { status: "idle" }
  | { status: "preparing"; phase: RagequitPhase }
  | { status: "ready"; proof: ContractRagequitProof }
  | { status: "submitting" }
  | { status: "confirming"; txHash: `0x${string}` }
  | { status: "confirmed"; txHash: `0x${string}` }
  | { status: "error"; error: AppError };

interface RagequitControllerState {
  state: RagequitState;
  selectedNote: Note | null;
  lastError: AppError | null;
}

const state = proxy<RagequitControllerState>({
  state: { status: "idle" },
  selectedNote: null,
  lastError: null,
});

// Engine instance for current ragequit flow
let currentEngine: RagequitEngine | null = null;
let prepareId = 0;

const { transition } = createStateMachine<RagequitState>({
  name: "RagequitController",
  allowedTransitions: {
    idle: ["preparing"],
    preparing: ["ready", "error"],
    ready: ["submitting", "idle"],
    submitting: ["confirming", "error"],
    confirming: ["confirmed", "error"],
    confirmed: ["idle"],
    error: ["idle", "preparing"],
  },
  getState: () => state.state,
  setState: (next) => {
    state.state = next;
  },
});

export const RagequitSelectors = {
  canRagequit: () => {
    const crypto = AuthController.state.crypto;
    return (
      state.state.status === "idle" &&
      state.selectedNote !== null &&
      canRagequit(state.selectedNote) &&
      crypto.cryptoReady
    );
  },

  getSelectedNote: () => state.selectedNote,

  getAmount: () => {
    if (!state.selectedNote) return "0";
    return state.selectedNote.amount;
  },

  isInProgress: () => {
    const status = state.state.status;
    return status === "preparing" || status === "submitting" || status === "confirming";
  },
};

export const RagequitController = {
  state,

  selectNote(note: Note | null): void {
    state.selectedNote = note;
    state.lastError = null;
    if (state.state.status === "error" || state.state.status === "ready") {
      transition({ status: "idle" });
    }
  },

  /**
   * Prepare the ragequit proof
   */
  async prepare(): Promise<void> {
    const current = ++prepareId;
    const crypto = AuthController.state.crypto;

    if (!state.selectedNote) {
      state.lastError = Errors.withdrawal.precondition("No note selected");
      return;
    }

    if (!crypto.cryptoReady || !crypto.accountKey) {
      state.lastError = Errors.auth.failed("Account not ready");
      return;
    }

    if (!canRagequit(state.selectedNote)) {
      state.lastError = Errors.withdrawal.precondition("Note cannot be ragequit");
      return;
    }

    try {
      transition({ status: "preparing", phase: "idle" });
      currentEngine = new RagequitEngine();

      const proof = await currentEngine.prepare({
        note: state.selectedNote,
        accountKey: crypto.accountKey,
      });

      if (current !== prepareId) return;

      transition({ status: "ready", proof });
    } catch (error) {
      if (current !== prepareId) return;
      const appError = Errors.withdrawal.proofFailed(error);
      state.lastError = appError;
      transition({ status: "error", error: appError });
      currentEngine = null;
    }
  },

  /**
   * Submit the ragequit transaction
   * Requires prepare() to be called first
   *
   * @param walletClient - The connected wallet client from wagmi
   */
  async submit(walletClient: WalletClient<Transport, Chain, Account>): Promise<void> {
    if (state.state.status !== "ready" || !currentEngine) {
      return;
    }

    try {
      transition({ status: "submitting" });

      const result = await currentEngine.execute(walletClient);

      transition({ status: "confirming", txHash: result.txHash });

      // Receipt already waited for in engine
      transition({ status: "confirmed", txHash: result.txHash });

      // Trigger notes refresh
      NotesDiscoveryController.refresh();
    } catch (error) {
      const userMessage = getUserMessage(error, "Ragequit failed");
      const appError = Errors.withdrawal.transactionFailed(userMessage, error);
      state.lastError = appError;
      transition({ status: "error", error: appError });
      currentEngine = null;
    }
  },

  /**
   * Prepare and submit in one call
   */
  async confirm(walletClient: WalletClient<Transport, Chain, Account>): Promise<void> {
    await this.prepare();
    if (state.state.status !== "ready") {
      return;
    }
    await this.submit(walletClient);
  },

  reset(): void {
    state.selectedNote = null;
    state.lastError = null;
    currentEngine = null;
    if (state.state.status !== "idle") {
      transition({ status: "idle" });
    }
  },

  retry(): void {
    if (state.state.status === "error") {
      currentEngine = null;
      transition({ status: "idle" });
    }
  },
};
