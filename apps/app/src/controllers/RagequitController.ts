/**
 * RagequitController - State machine for emergency exit flow
 *
 * Ragequit allows users to withdraw their funds publicly without ASP approval.
 * The user pays gas directly (no bundler/paymaster).
 */

import { proxy } from "valtio";
import type { Note, SpendableNote } from "@shinobi-cash/core/discovery";
import { canRagequit } from "@shinobi-cash/core/discovery";
import type { Call } from "@shinobi-cash/core/account";
import type { WalletClient } from "viem";
import { POOL_CHAIN } from "@shinobi-cash/constants";
import { withDeposit } from "@shinobi-cash/client/deposit";
import { AuthController } from "@/controllers/AuthController";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";
import { getShinobiClient } from "@/runtime/ClientSingleton";
import { createStateMachine } from "@/utils/stateMachine";
import { type AppError, Errors, getUserMessage } from "@/lib/errors/errors";

function getRagequitClient() {
  return getShinobiClient().extend(withDeposit());
}

type RagequitState =
  | { status: "idle" }
  | { status: "preparing" }
  | { status: "ready"; txRequest: Call }
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
    return (
      state.state.status === "idle" &&
      state.selectedNote !== null &&
      canRagequit(state.selectedNote) &&
      AuthController.isAuthenticated()
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

  async prepare(): Promise<void> {
    const current = ++prepareId;

    if (!state.selectedNote) {
      state.lastError = Errors.withdrawal.precondition("No note selected");
      return;
    }

    if (!AuthController.isAuthenticated()) {
      state.lastError = Errors.auth.failed("Account not ready");
      return;
    }

    if (!canRagequit(state.selectedNote)) {
      state.lastError = Errors.withdrawal.precondition("Note cannot be ragequit");
      return;
    }

    try {
      transition({ status: "preparing" });

      const txRequest = await getRagequitClient().prepareRagequit({
        note: state.selectedNote as SpendableNote,
      });

      if (current !== prepareId) return;

      transition({ status: "ready", txRequest });
    } catch (error) {
      if (current !== prepareId) return;
      const appError = Errors.withdrawal.proofFailed(error);
      state.lastError = appError;
      transition({ status: "error", error: appError });
    }
  },

  async submit(signer: WalletClient): Promise<void> {
    if (state.state.status !== "ready") return;

    const { txRequest } = state.state;

    try {
      transition({ status: "submitting" });

      const client = getRagequitClient();
      const txHash = await client.ragequit(txRequest, signer);

      transition({ status: "confirming", txHash });

      const result = await client.waitForTransaction(txHash, POOL_CHAIN.id);
      if (result.status === "reverted") {
        throw Errors.withdrawal.transactionFailed("Ragequit transaction reverted");
      }

      transition({ status: "confirmed", txHash });

      NotesDiscoveryController.refresh();
    } catch (error) {
      const userMessage = getUserMessage(error, "Ragequit failed");
      const appError = Errors.withdrawal.transactionFailed(userMessage, error);
      state.lastError = appError;
      transition({ status: "error", error: appError });
    }
  },

  async confirm(signer: WalletClient): Promise<void> {
    await this.prepare();
    if (state.state.status !== "ready") return;
    await this.submit(signer);
  },

  reset(): void {
    state.selectedNote = null;
    state.lastError = null;
    if (state.state.status !== "idle") {
      transition({ status: "idle" });
    }
  },

  retry(): void {
    if (state.state.status === "error") {
      transition({ status: "idle" });
    }
  },
};
