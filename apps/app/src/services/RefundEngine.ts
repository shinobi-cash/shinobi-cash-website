/**
 * RefundEngine - Orchestrates refund of expired crosschain intents
 *
 * Two execution paths:
 * - Deposit refund: direct wallet call on origin chain (user pays gas)
 * - Withdrawal refund: via ShinobiCashClient (bundler, paymaster sponsors gas)
 */

import type { Intent, RawShinobiIntent } from "@shinobi-cash/data";
import type { TransactionReceipt, WalletClient, Account, Transport, Chain } from "viem";
import {
  SHINOBI_CASH_WITHDRAWAL_INPUT_SETTLER,
  SHINOBI_CASH_CROSSCHAIN_CONTRACTS,
} from "@shinobi-cash/constants";
import {
  isIntentRefundable,
  getRefundType,
  decodeRawIntentData,
  type RefundType,
} from "@shinobi-cash/core/intent";
import { getShinobiAccount } from "@/runtime/AccountSingleton";
import { getShinobiClient } from "@/runtime/ClientSingleton";
import { indexerClient } from "@/lib/indexer/client";
import { getPublicClient } from "@/lib/clients";
import { Errors, logError } from "@/lib/errors/errors";

type RefundPhase =
  | "idle"
  | "fetching"
  | "ready"
  | "submitting"
  | "confirming"
  | "complete";

export interface RefundRequest {
  orderId: string;
}

export interface RefundResult {
  txHash: string;
  refundType: RefundType;
}

interface RefundEngineState {
  phase: RefundPhase;
  request: RefundRequest | null;
  intent: Intent | null;
  rawIntent: RawShinobiIntent | null;
  refundType: RefundType | null;
  result: RefundResult | null;
}

/**
 * Get the settler contract address for the given refund type and chain
 */
function getSettlerAddress(refundType: RefundType, originChainId: number): `0x${string}` {
  if (refundType === "withdrawal") {
    return SHINOBI_CASH_WITHDRAWAL_INPUT_SETTLER.address as `0x${string}`;
  }
  const chainContracts = SHINOBI_CASH_CROSSCHAIN_CONTRACTS[originChainId as keyof typeof SHINOBI_CASH_CROSSCHAIN_CONTRACTS];
  if (!chainContracts) {
    throw Errors.blockchain.contractError(`No deposit settler found for chain ${originChainId}`);
  }
  return chainContracts.DEPOSIT_INPUT_SETTLER.address as `0x${string}`;
}

export class RefundEngine {
  private state: RefundEngineState = {
    phase: "idle",
    request: null,
    intent: null,
    rawIntent: null,
    refundType: null,
    result: null,
  };

  getState(): Readonly<RefundEngineState> {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      phase: "idle",
      request: null,
      intent: null,
      rawIntent: null,
      refundType: null,
      result: null,
    };
  }

  /**
   * Fetch intent data from indexer and validate refundability.
   * Must be called before execute().
   */
  async prepare(request: RefundRequest): Promise<{ intent: Intent; refundType: RefundType }> {
    this.reset();
    this.state.request = request;
    this.state.phase = "fetching";

    const intent = await indexerClient.intent.getById(request.orderId);
    if (!intent) {
      throw Errors.indexer.fetchFailed(`Intent not found: ${request.orderId}`);
    }

    if (!intent.rawIntentData) {
      throw Errors.indexer.invalidResponse(
        new Error("Indexer did not return raw intent data needed for refund")
      );
    }

    if (!isIntentRefundable(intent)) {
      if (intent.phase !== "ESCROWED") {
        throw Errors.blockchain.contractError(`Intent is not escrowed (phase: ${intent.phase})`);
      }
      throw Errors.blockchain.contractError("Intent has not expired yet");
    }

    const rawIntent = decodeRawIntentData(intent.rawIntentData);
    intent.rawIntent = rawIntent;

    const refundType = getRefundType(intent);
    this.state.intent = intent;
    this.state.rawIntent = rawIntent;
    this.state.refundType = refundType;
    this.state.phase = "ready";

    return { intent, refundType };
  }

  /**
   * Execute deposit refund via SDK + direct wallet call on origin chain.
   */
  async executeDepositRefund(
    walletClient: WalletClient<Transport, Chain, Account>
  ): Promise<RefundResult> {
    const { intent, rawIntent } = this.assertPrepared("deposit");
    const originChainId = Number(intent.originChainId);
    const settlerAddress = getSettlerAddress("deposit", originChainId);

    const txRequest = getShinobiAccount().refundDeposit({
      rawIntent,
      settlerAddress,
      originChainId,
    });

    this.state.phase = "submitting";
    try {
      const txHash = await walletClient.sendTransaction({
        to: txRequest.to,
        data: txRequest.data,
      });

      this.state.phase = "confirming";
      const publicClient = getPublicClient(originChainId);
      const receipt: TransactionReceipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
      });

      if (receipt.status === "reverted") {
        throw Errors.blockchain.transactionReverted("Refund transaction reverted");
      }

      this.state.phase = "complete";
      this.state.result = { txHash, refundType: "deposit" };
      return this.state.result;
    } catch (error) {
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("user rejected") || msg.includes("user denied")) {
          throw Errors.blockchain.userRejected(error);
        }
      }
      logError(error, { action: "executeDepositRefund" });
      throw Errors.blockchain.transactionFailed("Deposit refund failed", error);
    }
  }

  /**
   * Execute withdrawal refund via ShinobiCashClient (bundler-based).
   */
  async executeWithdrawalRefund(): Promise<RefundResult> {
    const { rawIntent } = this.assertPrepared("withdrawal");
    const settlerAddress = getSettlerAddress("withdrawal", 0);

    this.state.phase = "submitting";
    try {
      const client = getShinobiClient();
      const prepared = await client.prepareWithdrawalRefund({
        rawIntent,
        settlerAddress,
      });

      this.state.phase = "confirming";
      const txHash = await client.submitWithdrawal(prepared);

      this.state.phase = "complete";
      this.state.result = { txHash, refundType: "withdrawal" };
      return this.state.result;
    } catch (error) {
      logError(error, { action: "executeWithdrawalRefund" });
      throw Errors.blockchain.transactionFailed("Withdrawal refund failed", error);
    }
  }

  private assertPrepared(expectedType: RefundType): { intent: Intent; rawIntent: RawShinobiIntent } {
    const { intent, rawIntent, refundType } = this.state;
    if (!intent || !rawIntent || refundType !== expectedType) {
      throw Errors.blockchain.contractError(
        `Must call prepare() first with a ${expectedType} intent`
      );
    }
    return { intent, rawIntent };
  }
}
