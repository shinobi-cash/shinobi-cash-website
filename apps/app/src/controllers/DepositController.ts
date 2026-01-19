import { proxy } from "valtio";
import { depositService, type CashNoteData, type GasEstimate } from "@/utils/deposit";
import { formatDepositAmountsForDisplay } from "@/utils/depositFees";
import { isDepositSupported } from "@/utils/depositRoute";
import { DEPOSIT_FEES, POOL_CHAIN } from "@shinobi-cash/constants";
import type { PublicClient, WalletClient } from "viem";
import { AuthController } from "@/controllers/AuthController";
import { NotesDiscoverySelectors } from "@/controllers/NotesDiscoveryController";
import { type AppError, Errors, getUserMessage } from "@/lib/errors/errors";

export interface DepositAmounts {
  noteAmount: number;
  complianceFee: number;
  solverFee: number;
}

type DepositState =
  | { status: "idle" }
  | { status: "preparing"; step: "crypto" | "commitment" | "gas" }
  | { status: "ready"; amounts: DepositAmounts; gasEstimate: GasEstimate; noteData: CashNoteData }
  | { status: "submitting" }
  | { status: "confirming"; txHash: `0x${string}` }
  | { status: "confirmed-onchain"; txHash: `0x${string}` }
  | { status: "failed"; txHash: `0x${string}`; reason: string }
  | { status: "error"; error: AppError };

export interface WalletContext {
  isConnected: boolean;
  address: string | undefined;
  chainId: number;
  balance: string;
  publicClient: PublicClient | undefined;
  walletClient: WalletClient | undefined;
  gasPrice: bigint | undefined;
}

interface DepositControllerState {
  state: DepositState;
  amount: string;
  lastPreparedAmounts: DepositAmounts | null;
  wallet: WalletContext;
}

const state = proxy<DepositControllerState>({
  state: { status: "idle" },
  amount: "",
  lastPreparedAmounts: null,
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

export const DepositSelectors = {
  canDeposit: () => state.state.status === "ready",

  canAutoPrepare: () => {
    const crypto = AuthController.state.crypto;
    return (
      state.amount.trim() !== "" &&
      state.wallet.isConnected &&
      crypto.cryptoReady &&
      isDepositSupported(state.wallet.chainId)
    );
  },

  isCrossChain: () => state.wallet.chainId !== POOL_CHAIN.id,

  isOnSupportedChain: () => isDepositSupported(state.wallet.chainId),
};

let prepareId = 0;
let prepareTimeout: ReturnType<typeof setTimeout> | null = null;

const allowedTransitions: Record<DepositState["status"], DepositState["status"][]> = {
  idle: ["preparing"],
  preparing: ["ready", "error"],
  ready: ["submitting", "preparing", "idle"],
  submitting: ["confirming", "error"],
  confirming: ["confirmed-onchain", "failed"],
  "confirmed-onchain": [],
  failed: ["preparing", "idle"],
  error: ["idle", "preparing"],
};

function transition(next: DepositState) {
  const current = state.state.status;
  if (process.env.NODE_ENV !== "production" && !allowedTransitions[current].includes(next.status)) {
    console.warn(`[DepositController] Invalid transition: ${current} → ${next.status}`);
  }
  state.state = next;
}

export const DepositController = {
  state,

  setAmount(amount: string) {
    state.amount = amount;
    if (state.state.status === "error" || state.state.status === "failed") {
      transition({ status: "idle" });
    }
  },

  schedulePrepare(delay = 1000) {
    if (prepareTimeout) clearTimeout(prepareTimeout);
    prepareTimeout = setTimeout(() => this.prepare(), delay);
  },

  async prepare() {
    const current = ++prepareId;
    const { amount, wallet } = state;
    const crypto = AuthController.state.crypto;

    if (!amount || !crypto.cryptoReady || !crypto.publicKey || !crypto.accountKey) {
      transition({
        status: "error",
        error: Errors.deposit.precondition("Crypto context not ready"),
      });
      return;
    }

    if (!wallet.publicClient || !wallet.gasPrice) {
      transition({ status: "error", error: Errors.deposit.precondition("Network not ready") });
      return;
    }

    transition({ status: "preparing", step: "commitment" });

    const lastUsedIndex = NotesDiscoverySelectors.getLastUsedIndex();
    let noteData: CashNoteData | null = null;
    let retries = 0;
    const MAX_RETRIES = 3;

    while (retries < MAX_RETRIES) {
      if (current !== prepareId) return;
      try {
        noteData = await depositService.generateCommitment(
          crypto.accountKey,
          crypto.publicKey,
          lastUsedIndex
        );
        break;
      } catch (error) {
        retries++;
        if (retries >= MAX_RETRIES) {
          if (current !== prepareId) return;
          transition({ status: "error", error: Errors.deposit.commitmentFailed(error) });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!noteData || current !== prepareId) return;

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
      if (current !== prepareId) return;
      transition({ status: "error", error: Errors.deposit.gasEstimationFailed(error) });
      return;
    }

    if (current !== prepareId) return;

    const amounts = formatDepositAmountsForDisplay(amount);
    const isCrossChain = wallet.chainId !== POOL_CHAIN.id;
    const solverFee = isCrossChain
      ? (parseFloat(amount) * DEPOSIT_FEES.DEFAULT_SOLVER_FEE_BPS) / 10_000
      : 0;

    const preparedAmounts = { ...amounts, solverFee };
    state.lastPreparedAmounts = preparedAmounts;

    transition({ status: "ready", amounts: preparedAmounts, gasEstimate, noteData });
  },

  async submit() {
    if (state.state.status !== "ready") return;

    const { noteData } = state.state;
    const { amount, wallet } = state;

    if (!wallet.walletClient) {
      transition({
        status: "error",
        error: Errors.deposit.transactionFailed("Wallet not connected"),
      });
      return;
    }

    transition({ status: "submitting" });

    try {
      const txHash = await depositService.submitTransaction(
        amount,
        noteData,
        wallet.chainId,
        wallet.walletClient
      );
      transition({ status: "confirming", txHash });
      this._trackTransaction(txHash);
    } catch (error) {
      const userMessage = getUserMessage(error, "Transaction failed");
      transition({ status: "error", error: Errors.deposit.transactionFailed(userMessage, error) });
    }
  },

  reset() {
    state.amount = "";
    state.lastPreparedAmounts = null;
    transition({ status: "idle" });
  },

  async retry() {
    if (state.state.status === "error" || state.state.status === "failed") {
      await this.prepare();
    }
  },

  _updateWallet(wallet: WalletContext) {
    state.wallet = wallet;
  },

  async _trackTransaction(txHash: `0x${string}`) {
    const { wallet } = state;

    if (!wallet.publicClient) {
      transition({ status: "error", error: Errors.deposit.trackingFailed() });
      return;
    }

    await depositService.trackTransaction(txHash, wallet.publicClient, (status, reason) => {
      if (status === "confirmed") {
        transition({ status: "confirmed-onchain", txHash });
      } else if (status === "failed") {
        transition({ status: "failed", txHash, reason: reason ?? "Unknown error" });
      }
    });
  },
};
