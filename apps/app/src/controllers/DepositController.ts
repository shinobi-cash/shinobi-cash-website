import { proxy } from "valtio";
import { isDepositSupported } from "@shinobi-cash/core/deposit";
import { createStateMachine } from "@/utils/stateMachine";
import {
  POOL_CHAIN,
  MIN_AMOUNT_CONFIG,
  CROSSCHAIN_DEPOSIT_FALLBACK,
} from "@shinobi-cash/constants";
import { parseEther, formatEther } from "viem";
import type { WalletClient } from "viem";
import { AuthController } from "@/controllers/AuthController";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";
import { type AppError, Errors, getUserMessage, logError } from "@/lib/errors/errors";
import { PREPARE_DEBOUNCE_MS } from "@/constants/timings";
import { withDeposit } from "@shinobi-cash/client/deposit";
import { withCrosschainDeposit } from "@shinobi-cash/client/crosschain-deposit";
import type { SolverQuote } from "@shinobi-cash/client";
import type { Call } from "@shinobi-cash/core/account";
import { getShinobiClient } from "@/runtime/ClientSingleton";
import { createShinobiSolver } from "@/utils/solver";

const solver = createShinobiSolver();

function getDepositClient() {
  return getShinobiClient().extend(withDeposit()).extend(withCrosschainDeposit(solver));
}

export interface DepositAmounts {
  noteAmount: number;
  complianceFee: number;
  solverFee: number;
}

export interface GasEstimate {
  gasCostEth: string;
  gasCostWei: bigint;
  gasLimit: bigint;
}

type DepositState =
  | { status: "idle" }
  | { status: "preparing" }
  | { status: "ready"; amounts: DepositAmounts; gasEstimate: GasEstimate; call: Call }
  | { status: "submitting" }
  | { status: "confirming"; txHash: `0x${string}` }
  | { status: "confirmed"; txHash: `0x${string}` }
  | { status: "failed"; txHash: `0x${string}`; reason: string }
  | { status: "error"; error: AppError };

export interface WalletContext {
  isConnected: boolean;
  address: string | undefined;
  chainId: number;
  balance: string;
  walletClient: WalletClient | undefined;
}

interface DepositControllerState {
  state: DepositState;
  amount: string;
  lastPreparedAmounts: DepositAmounts | null;
  wallet: WalletContext;
  /** User-configurable solver fee in basis points */
  solverFeeBPS: number;
  /** Fill deadline in seconds (cross-chain only) */
  fillDeadlineSeconds: number;
  /** Expiry in seconds (cross-chain only) */
  expirySeconds: number;
  /** Contract defaults fetched from chain (null for same-chain) */
  contractDefaults: SolverQuote | null;
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
    walletClient: undefined,
  },
  solverFeeBPS: CROSSCHAIN_DEPOSIT_FALLBACK.SOLVER_FEE_BPS,
  fillDeadlineSeconds: CROSSCHAIN_DEPOSIT_FALLBACK.FILL_DEADLINE_SECONDS,
  expirySeconds: CROSSCHAIN_DEPOSIT_FALLBACK.EXPIRY_SECONDS,
  contractDefaults: null,
});

export const DepositSelectors = {
  canDeposit: () => state.state.status === "ready",

  canAutoPrepare: () => {
    const { status } = state.state;
    if (status !== "idle" && status !== "ready" && status !== "error" && status !== "failed") {
      return false;
    }
    return (
      state.amount.trim() !== "" &&
      state.wallet.isConnected &&
      AuthController.isAuthenticated() &&
      isDepositSupported(state.wallet.chainId) &&
      DepositSelectors.isAboveMinimum()
    );
  },

  isCrossChain: () => state.wallet.chainId !== POOL_CHAIN.id,

  isOnSupportedChain: () => isDepositSupported(state.wallet.chainId),

  isAboveMinimum: () => {
    const amount = state.amount.trim();
    if (!amount) return false;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return false;

    const isCrossChain = state.wallet.chainId !== POOL_CHAIN.id;
    const minAmount = isCrossChain
      ? MIN_AMOUNT_CONFIG.MIN_CROSSCHAIN_DEPOSIT
      : MIN_AMOUNT_CONFIG.MIN_POOL_DEPOSIT;

    try {
      const amountWei = parseEther(amount);
      return amountWei >= minAmount;
    } catch {
      return false;
    }
  },

  /** Check if user is using contract default settings (for cross-chain) */
  isUsingDefaultSettings: () => {
    const defaults = state.contractDefaults;
    // If defaults not fetched yet, assume using defaults
    if (!defaults) return true;

    return (
      state.solverFeeBPS === defaults.solverFeeBPS &&
      state.fillDeadlineSeconds === defaults.fillDeadlineSeconds &&
      state.expirySeconds === defaults.expirySeconds
    );
  },
};

let prepareId = 0;
let prepareTimeout: ReturnType<typeof setTimeout> | null = null;

function clearPrepareTimeout() {
  if (prepareTimeout) {
    clearTimeout(prepareTimeout);
    prepareTimeout = null;
  }
}

const { transition } = createStateMachine<DepositState>({
  name: "DepositController",
  allowedTransitions: {
    idle: ["preparing"],
    preparing: ["ready", "error", "idle", "preparing"],
    ready: ["submitting", "preparing", "idle"],
    submitting: ["confirming", "error"],
    confirming: ["confirmed", "failed"],
    confirmed: ["idle"],
    failed: ["preparing", "idle"],
    error: ["idle", "preparing"],
  },
  getState: () => state.state,
  setState: (next) => {
    state.state = next;
  },
});

export const DepositController = {
  state,

  setAmount(amount: string) {
    state.amount = amount;
    const { status } = state.state;

    if (status === "error" || status === "failed") {
      transition({ status: "idle" });
      return;
    }

    if ((status === "preparing" || status === "ready") && !DepositSelectors.canAutoPrepare()) {
      transition({ status: "idle" });
    }
  },

  schedulePrepare(delay = PREPARE_DEBOUNCE_MS) {
    clearPrepareTimeout();
    prepareTimeout = setTimeout(() => this.prepare(), delay);
  },

  async prepare() {
    const current = ++prepareId;
    const { amount, wallet } = state;
    if (!amount || !AuthController.isAuthenticated() || !wallet.address) {
      transition({
        status: "error",
        error: Errors.deposit.precondition("Wallet not connected"),
      });
      return;
    }

    const depositorAddress = wallet.address as `0x${string}`;

    transition({ status: "preparing" });

    try {
      const client = getDepositClient();
      const amountWei = parseEther(amount);
      const isCrossChain = wallet.chainId !== POOL_CHAIN.id;

      const feeQuote = isCrossChain
        ? client.quoteCrosschainDeposit({ amountWei, solverFeeBPS: state.solverFeeBPS })
        : client.quoteDeposit({ amountWei });

      const call = isCrossChain
        ? client.prepareCrosschainDeposit({
            amountWei,
            chainId: wallet.chainId,
            settings: {
              solverFeeBPS: state.solverFeeBPS,
              fillDeadlineSeconds: state.fillDeadlineSeconds,
              expirySeconds: state.expirySeconds,
            },
            useDefaults: DepositSelectors.isUsingDefaultSettings(),
          })
        : client.prepareDeposit({ amountWei });

      const [gasEstimateRaw, gasPrice] = await Promise.all([
        client.estimateGas(
          { to: call.to, data: call.data, value: call.value, account: depositorAddress },
          wallet.chainId
        ),
        client.getGasPrice(wallet.chainId),
      ]);

      if (current !== prepareId) return;

      const gasLimit = (gasEstimateRaw * BigInt(120)) / BigInt(100);
      const gasCostWei = gasLimit * gasPrice;

      const amounts: DepositAmounts = {
        noteAmount: parseFloat(formatEther(feeQuote.noteAmountWei)),
        complianceFee: parseFloat(formatEther(feeQuote.complianceFeeWei)),
        solverFee: parseFloat(formatEther(feeQuote.solverFeeWei)),
      };

      const gasEstimate: GasEstimate = {
        gasCostEth: formatEther(gasCostWei),
        gasCostWei,
        gasLimit,
      };

      state.lastPreparedAmounts = amounts;
      transition({ status: "ready", amounts, gasEstimate, call });
    } catch (error) {
      if (current !== prepareId) return;
      transition({ status: "error", error: Errors.deposit.commitmentFailed(error) });
    }
  },

  async submit() {
    if (state.state.status !== "ready") return;
    clearPrepareTimeout();

    const { call } = state.state;
    const { wallet } = state;

    if (!wallet.walletClient?.account) {
      transition({
        status: "error",
        error: Errors.deposit.transactionFailed("Wallet not connected"),
      });
      return;
    }

    transition({ status: "submitting" });

    try {
      const client = getDepositClient();
      const txHash = await client.deposit(call, wallet.walletClient!);
      transition({ status: "confirming", txHash });
      this._trackTransaction(txHash);
    } catch (error) {
      const userMessage = getUserMessage(error, "Transaction failed");
      transition({ status: "error", error: Errors.deposit.transactionFailed(userMessage, error) });
    }
  },

  reset() {
    clearPrepareTimeout();
    state.amount = "";
    state.lastPreparedAmounts = null;
    if (state.state.status !== "idle") {
      transition({ status: "idle" });
    }
  },

  setSolverFeeBPS(feeBPS: number) {
    state.solverFeeBPS = feeBPS;
    if (state.state.status === "ready") {
      this.schedulePrepare(0);
    }
  },

  setFillDeadlineSeconds(seconds: number) {
    state.fillDeadlineSeconds = seconds;
    if (state.state.status === "ready") {
      this.schedulePrepare(0);
    }
  },

  setExpirySeconds(seconds: number) {
    state.expirySeconds = seconds;
    if (state.state.status === "ready") {
      this.schedulePrepare(0);
    }
  },

  resetToDefaults() {
    const defaults = state.contractDefaults;
    if (defaults) {
      state.solverFeeBPS = defaults.solverFeeBPS;
      state.fillDeadlineSeconds = defaults.fillDeadlineSeconds;
      state.expirySeconds = defaults.expirySeconds;
    } else {
      state.solverFeeBPS = CROSSCHAIN_DEPOSIT_FALLBACK.SOLVER_FEE_BPS;
      state.fillDeadlineSeconds = CROSSCHAIN_DEPOSIT_FALLBACK.FILL_DEADLINE_SECONDS;
      state.expirySeconds = CROSSCHAIN_DEPOSIT_FALLBACK.EXPIRY_SECONDS;
    }
    if (state.state.status === "ready") {
      this.schedulePrepare(0);
    }
  },

  async retry() {
    if (state.state.status === "error" || state.state.status === "failed") {
      await this.prepare();
    }
  },

  _updateWallet(wallet: WalletContext) {
    const chainChanged = state.wallet.chainId !== wallet.chainId;
    state.wallet = wallet;

    if (chainChanged) {
      this._fetchContractDefaults();
    }
  },

  async _fetchContractDefaults() {
    const { wallet } = state;

    if (wallet.chainId === POOL_CHAIN.id) {
      state.contractDefaults = null;
      return;
    }

    try {
      const client = getDepositClient();
      const defaults = await client.getSolverQuote({
        originChainId: wallet.chainId,
        destinationChainId: POOL_CHAIN.id,
        amountWei: "0",
        type: "deposit",
      });
      state.contractDefaults = defaults;

      state.solverFeeBPS = defaults.solverFeeBPS;
      state.fillDeadlineSeconds = defaults.fillDeadlineSeconds;
      state.expirySeconds = defaults.expirySeconds;
    } catch (error) {
      logError(Errors.network.requestFailed("Failed to fetch contract defaults", error));
    }
  },

  async _trackTransaction(txHash: `0x${string}`) {
    try {
      const client = getDepositClient();
      const result = await client.waitForTransaction(txHash, state.wallet.chainId);

      if (result.status === "success") {
        transition({ status: "confirmed", txHash });
        NotesDiscoveryController.refresh();
      } else {
        transition({ status: "failed", txHash, reason: "Transaction reverted" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Transaction tracking failed";
      transition({ status: "failed", txHash, reason: errorMessage });
    }
  },
};
