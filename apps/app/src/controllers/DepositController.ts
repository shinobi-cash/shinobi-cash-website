import { proxy } from "valtio";
import { isDepositSupported } from "@shinobi-cash/core/deposit";
import type { TransactionRequest } from "@shinobi-cash/core/account";
import { getShinobiAccount } from "@/runtime/AccountSingleton";
import { createStateMachine } from "@/utils/stateMachine";
import {
  FEE_CONFIG,
  POOL_CHAIN,
  MIN_AMOUNT_CONFIG,
  CROSSCHAIN_DEPOSIT_FALLBACK,
  SHINOBI_CASH_ETH_POOL,
} from "@shinobi-cash/constants";
import { parseEther, formatEther } from "viem";
import { estimateGas, waitForTransactionReceipt } from "viem/actions";
import { calculateDepositFeeBreakdown } from "@/utils/depositFees";
import type { PublicClient, WalletClient } from "viem";
import { AuthController } from "@/controllers/AuthController";
import { NotesDiscoveryController, NotesDiscoverySelectors } from "@/controllers/NotesDiscoveryController";
import { type AppError, Errors, getUserMessage } from "@/lib/errors/errors";
import { PREPARE_DEBOUNCE_MS, TX_RECEIPT_TIMEOUT_MS } from "@/constants/timings";
import type { SolverQuote } from "@shinobi-cash/client";
import { getShinobiClient } from "@/runtime/ClientSingleton";

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
  | { status: "preparing"; step: "commitment" | "gas" }
  | { status: "ready"; amounts: DepositAmounts; gasEstimate: GasEstimate; txRequest: TransactionRequest }
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
  publicClient: PublicClient | undefined;
  walletClient: WalletClient | undefined;
  gasPrice: bigint | undefined;
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
    publicClient: undefined,
    walletClient: undefined,
    gasPrice: undefined,
  },
  solverFeeBPS: CROSSCHAIN_DEPOSIT_FALLBACK.SOLVER_FEE_BPS,
  fillDeadlineSeconds: CROSSCHAIN_DEPOSIT_FALLBACK.FILL_DEADLINE_SECONDS,
  expirySeconds: CROSSCHAIN_DEPOSIT_FALLBACK.EXPIRY_SECONDS,
  contractDefaults: null,
});

export const DepositSelectors = {
  canDeposit: () => state.state.status === "ready",

  canAutoPrepare: () => {
    return (
      state.amount.trim() !== "" &&
      state.wallet.isConnected &&
      AuthController.isAuthenticated() &&
      !!state.wallet.publicClient &&
      !!state.wallet.gasPrice &&
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
    if (prepareTimeout) clearTimeout(prepareTimeout);
    prepareTimeout = setTimeout(() => this.prepare(), delay);
  },

  async prepare() {
    const current = ++prepareId;
    const { amount, wallet } = state;
    if (!amount || !AuthController.isAuthenticated()) {
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

    // Generate transaction request via SDK
    let txRequest: TransactionRequest;
    try {
      const depositIndex = NotesDiscoverySelectors.getLastUsedIndex(wallet.chainId) + 1;
      txRequest = getShinobiAccount().deposit({
        poolAddress: SHINOBI_CASH_ETH_POOL.address as `0x${string}`,
        amountWei: parseEther(amount),
        chainId: wallet.chainId,
        depositIndex,
        settings: {
          solverFeeBPS: state.solverFeeBPS,
          fillDeadlineSeconds: state.fillDeadlineSeconds,
          expirySeconds: state.expirySeconds,
        },
        useDefaults: DepositSelectors.isUsingDefaultSettings(),
      });
    } catch (error) {
      if (current !== prepareId) return;
      transition({ status: "error", error: Errors.deposit.commitmentFailed(error) });
      return;
    }

    if (current !== prepareId) return;

    transition({ status: "preparing", step: "gas" });

    // Estimate gas
    let gasEstimate: GasEstimate;
    try {
      const gasLimit = await estimateGas(wallet.publicClient, {
        to: txRequest.to,
        data: txRequest.data,
        value: txRequest.value,
        account: wallet.address as `0x${string}`,
      });
      const bufferedGas = (gasLimit * BigInt(120)) / BigInt(100);
      const gasCostWei = bufferedGas * wallet.gasPrice;
      gasEstimate = {
        gasCostEth: formatEther(gasCostWei),
        gasCostWei,
        gasLimit: bufferedGas,
      };
    } catch (error) {
      if (current !== prepareId) return;
      transition({ status: "error", error: Errors.deposit.gasEstimationFailed(error) });
      return;
    }

    if (current !== prepareId) return;

    const amounts = calculateDepositFeeBreakdown(amount, FEE_CONFIG.VETTING_FEE_BPS);
    const isCrossChain = wallet.chainId !== POOL_CHAIN.id;
    const solverFee = isCrossChain ? (parseFloat(amount) * state.solverFeeBPS) / 10_000 : 0;

    const preparedAmounts = { ...amounts, solverFee };
    state.lastPreparedAmounts = preparedAmounts;

    transition({ status: "ready", amounts: preparedAmounts, gasEstimate, txRequest });
  },

  async submit() {
    if (state.state.status !== "ready") return;

    const { txRequest } = state.state;
    const { wallet } = state;

    if (!wallet.walletClient) {
      transition({
        status: "error",
        error: Errors.deposit.transactionFailed("Wallet not connected"),
      });
      return;
    }

    transition({ status: "submitting" });

    try {
      // Add 50% buffer to gas price to handle L2 gas fluctuations
      const gasParams = wallet.gasPrice
        ? {
            maxFeePerGas: (wallet.gasPrice * BigInt(150)) / BigInt(100),
            maxPriorityFeePerGas: (wallet.gasPrice * BigInt(150)) / BigInt(100),
          }
        : {};

      const txHash = await wallet.walletClient.sendTransaction({
        to: txRequest.to,
        data: txRequest.data,
        value: txRequest.value,
        chain: wallet.walletClient.chain,
        account: wallet.walletClient.account!,
        ...gasParams,
      });

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
      const client = getShinobiClient();
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
      console.warn("[DepositController] Failed to fetch contract defaults:", error);
    }
  },

  async _trackTransaction(txHash: `0x${string}`) {
    const { wallet } = state;

    if (!wallet.publicClient) {
      transition({ status: "error", error: Errors.deposit.trackingFailed() });
      return;
    }

    try {
      const receipt = await waitForTransactionReceipt(wallet.publicClient, {
        hash: txHash,
        timeout: TX_RECEIPT_TIMEOUT_MS,
      });

      if (receipt.status === "success") {
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
