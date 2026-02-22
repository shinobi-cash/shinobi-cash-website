/**
 * RefundEngine - Orchestrates refund of expired crosschain intents
 *
 * Two execution paths:
 * - Deposit refund: direct wallet call on origin chain (user pays gas)
 * - Withdrawal refund: UserOperation via bundler on pool chain (paymaster sponsors gas)
 */

import type { Intent, RawShinobiIntent } from "@shinobi-cash/data";
import type { TransactionReceipt, WalletClient, Account, Transport, Chain } from "viem";
import { encodeFunctionData, decodeAbiParameters } from "viem";
import {
  InputSettlerRefundAbi,
  ShinobiIntentComponents,
  SHINOBI_CASH_WITHDRAWAL_INPUT_SETTLER,
  SHINOBI_CASH_CROSSCHAIN_CONTRACTS,
} from "@shinobi-cash/constants";
import { indexerClient } from "@/lib/indexer/client";
import { getPublicClient, getRefundSmartAccountClient } from "@/lib/clients";
import { Errors, logError } from "@/lib/errors/errors";
import { isIntentRefundable, getRefundType, type RefundType } from "@/utils/refund";
import {
  prepareWithdrawalUserOperation,
  executeWithdrawalUserOperation,
} from "@/utils/withdrawalContract";

export type RefundPhase =
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
 * Convert the indexer's raw intent struct to the contract tuple format
 */
function toContractIntentStruct(raw: RawShinobiIntent) {
  return {
    user: raw.user as `0x${string}`,
    nonce: BigInt(raw.nonce),
    originChainId: BigInt(raw.originChainId),
    expires: Number(raw.expires),
    fillDeadline: Number(raw.fillDeadline),
    fillOracle: raw.fillOracle as `0x${string}`,
    inputs: raw.inputs.map(([tokenId, amount]) => [BigInt(tokenId), BigInt(amount)] as [bigint, bigint]),
    outputs: raw.outputs.map((o) => ({
      oracle: o.oracle as `0x${string}`,
      settler: o.settler as `0x${string}`,
      chainId: BigInt(o.chainId),
      token: o.token as `0x${string}`,
      amount: BigInt(o.amount),
      recipient: o.recipient as `0x${string}`,
      call: o.call as `0x${string}`,
      context: o.context as `0x${string}`,
    })),
    intentOracle: raw.intentOracle as `0x${string}`,
    refundCalldata: raw.refundCalldata as `0x${string}`,
  };
}

/**
 * Encode the refund calldata for the InputSettler.refund(intent) call
 */
function encodeRefundCallData(raw: RawShinobiIntent): `0x${string}` {
  const intentStruct = toContractIntentStruct(raw);
  return encodeFunctionData({
    abi: InputSettlerRefundAbi,
    functionName: "refund",
    args: [intentStruct],
  });
}

/**
 * Decode raw ABI-encoded ShinobiIntent (from Open event log.data) into RawShinobiIntent
 */
function decodeRawIntentData(rawIntentData: string): RawShinobiIntent {
  const [decoded] = decodeAbiParameters(
    [{ type: "tuple", components: ShinobiIntentComponents, name: "intent" }],
    rawIntentData as `0x${string}`
  );

  return {
    user: decoded.user,
    nonce: decoded.nonce.toString(),
    originChainId: decoded.originChainId.toString(),
    expires: String(decoded.expires),
    fillDeadline: String(decoded.fillDeadline),
    fillOracle: decoded.fillOracle,
    inputs: decoded.inputs.map(([tokenId, amount]) => [tokenId.toString(), amount.toString()] as [string, string]),
    outputs: decoded.outputs.map((o) => ({
      oracle: o.oracle,
      settler: o.settler,
      chainId: o.chainId.toString(),
      token: o.token,
      amount: o.amount.toString(),
      recipient: o.recipient,
      call: o.call,
      context: o.context,
    })),
    intentOracle: decoded.intentOracle,
    refundCalldata: decoded.refundCalldata,
  };
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

    // Decode ABI-encoded ShinobiIntent struct from event log data
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
   * Execute deposit refund via direct wallet call on origin chain.
   * User must be connected to the origin chain and pays gas directly.
   */
  async executeDepositRefund(
    walletClient: WalletClient<Transport, Chain, Account>
  ): Promise<RefundResult> {
    const { intent, rawIntent } = this.assertPrepared("deposit");
    const originChainId = Number(intent.originChainId);
    const settlerAddress = getSettlerAddress("deposit", originChainId);
    const callData = encodeRefundCallData(rawIntent);

    this.state.phase = "submitting";
    try {
      const txHash = await walletClient.sendTransaction({
        to: settlerAddress,
        data: callData,
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
   * Execute withdrawal refund via UserOperation on pool chain.
   * Uses crosschain withdrawal paymaster — gasless for the user.
   */
  async executeWithdrawalRefund(): Promise<RefundResult> {
    const { rawIntent } = this.assertPrepared("withdrawal");
    const settlerAddress = getSettlerAddress("withdrawal", 0);
    const callData = encodeRefundCallData(rawIntent);

    this.state.phase = "submitting";
    try {
      const { smartAccountClient, gasLimits } = await getRefundSmartAccountClient();
      const userOperation = await prepareWithdrawalUserOperation(
        smartAccountClient,
        callData,
        gasLimits,
        settlerAddress
      );

      this.state.phase = "confirming";
      const txHash = await executeWithdrawalUserOperation(
        smartAccountClient,
        userOperation,
        gasLimits
      );

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
