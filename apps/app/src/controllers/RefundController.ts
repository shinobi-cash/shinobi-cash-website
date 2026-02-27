/**
 * RefundController - State machine for crosschain intent refund flow
 *
 * Handles both deposit refunds (direct wallet call on origin chain)
 * and withdrawal refunds (UserOperation via paymaster on pool chain).
 */

import { proxy } from "valtio";
import type { Intent } from "@shinobi-cash/data";
import type { WalletClient } from "viem";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";
import { RefundEngine } from "@/services/RefundEngine";
import type { RefundType } from "@shinobi-cash/core/intent";
import { createStateMachine } from "@/utils/stateMachine";
import { type AppError, Errors, getUserMessage } from "@/lib/errors/errors";

type RefundState =
  | { status: "idle" }
  | { status: "fetching" }
  | { status: "ready"; intent: Intent; refundType: RefundType }
  | { status: "submitting" }
  | { status: "confirming"; txHash: string }
  | { status: "confirmed"; txHash: string; refundType: RefundType }
  | { status: "error"; error: AppError };

interface RefundControllerState {
  state: RefundState;
  orderId: string | null;
  lastError: AppError | null;
}

const state = proxy<RefundControllerState>({
  state: { status: "idle" },
  orderId: null,
  lastError: null,
});

let currentEngine: RefundEngine | null = null;
let prepareId = 0;

const { transition } = createStateMachine<RefundState>({
  name: "RefundController",
  allowedTransitions: {
    idle: ["fetching"],
    fetching: ["ready", "error"],
    ready: ["submitting", "idle"],
    submitting: ["confirming", "error"],
    confirming: ["confirmed", "error"],
    confirmed: ["idle"],
    error: ["idle", "fetching"],
  },
  getState: () => state.state,
  setState: (next) => {
    state.state = next;
  },
});

export const RefundSelectors = {
  isInProgress: () => {
    const status = state.state.status;
    return status === "fetching" || status === "submitting" || status === "confirming";
  },

  getIntent: (): Intent | null => {
    if (state.state.status === "ready") return state.state.intent;
    return null;
  },

  getRefundType: (): RefundType | null => {
    if (state.state.status === "ready") return state.state.refundType;
    if (state.state.status === "confirmed") return state.state.refundType;
    return null;
  },
};

export const RefundController = {
  state,

  /**
   * Set the orderId for the refund target
   */
  setOrderId(orderId: string): void {
    state.orderId = orderId;
    state.lastError = null;
    if (state.state.status === "error" || state.state.status === "ready") {
      transition({ status: "idle" });
    }
  },

  /**
   * Fetch intent from indexer and validate refundability
   */
  async prepare(): Promise<void> {
    const current = ++prepareId;

    if (!state.orderId) {
      state.lastError = Errors.blockchain.contractError("No orderId set");
      return;
    }

    try {
      transition({ status: "fetching" });
      currentEngine = new RefundEngine();

      const { intent, refundType } = await currentEngine.prepare({
        orderId: state.orderId,
      });

      if (current !== prepareId) return;

      transition({ status: "ready", intent, refundType });
    } catch (error) {
      if (current !== prepareId) return;
      const userMessage = getUserMessage(error, "Failed to prepare refund");
      const appError = Errors.indexer.fetchFailed(userMessage, error);
      state.lastError = appError;
      transition({ status: "error", error: appError });
      currentEngine = null;
    }
  },

  /**
   * Submit the refund transaction.
   * For deposit refunds: requires walletClient (user pays gas on origin chain).
   * For withdrawal refunds: walletClient not needed (gasless via paymaster).
   */
  async submit(signer?: WalletClient): Promise<void> {
    if (state.state.status !== "ready" || !currentEngine) return;

    const { refundType } = state.state;

    try {
      transition({ status: "submitting" });

      let result;
      if (refundType === "deposit") {
        if (!signer) {
          throw Errors.blockchain.contractError("Signer required for deposit refund");
        }
        result = await currentEngine.executeDepositRefund(signer);
      } else {
        result = await currentEngine.executeWithdrawalRefund();
      }

      transition({ status: "confirming", txHash: result.txHash });

      // Receipt already waited for in engine
      transition({ status: "confirmed", txHash: result.txHash, refundType });

      // Trigger notes refresh so refund note appears
      NotesDiscoveryController.refresh();
    } catch (error) {
      const userMessage = getUserMessage(error, "Refund failed");
      const appError = Errors.blockchain.transactionFailed(userMessage, error);
      state.lastError = appError;
      transition({ status: "error", error: appError });
      currentEngine = null;
    }
  },

  /**
   * Prepare and submit in one call
   */
  async confirm(signer?: WalletClient): Promise<void> {
    await this.prepare();
    if (state.state.status !== "ready") return;
    await this.submit(signer);
  },

  reset(): void {
    state.orderId = null;
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
