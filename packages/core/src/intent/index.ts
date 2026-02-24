import { AbiFunction, AbiParameters } from "ox";
import type { Intent, RawShinobiIntent } from "@shinobi-cash/data";
import {
  InputSettlerRefundAbi,
  ShinobiIntentComponents,
} from "@shinobi-cash/constants";

export type RefundType = "deposit" | "withdrawal";

const HANDLE_REFUND_ABI = [
  {
    type: "function",
    name: "handleRefund",
    inputs: [
      { name: "_refundCommitmentHash", type: "uint256" },
      { name: "_feeRecipient", type: "address" },
      { name: "_refundFeeBPS", type: "uint256" },
      { name: "_scope", type: "uint256" },
    ],
  },
] as const;

/**
 * Check if an intent is eligible for refund.
 * An intent is refundable when it's escrowed and past its expiry time.
 */
export function isIntentRefundable(intent: Intent): boolean {
  if (intent.phase !== "ESCROWED") return false;
  const expiresMs = Number(intent.expires) * 1000;
  return Date.now() >= expiresMs;
}

/**
 * Get the refund type based on intent type.
 * - DEPOSIT intents: refund on origin chain (direct wallet call)
 * - WITHDRAWAL intents: refund on pool chain (UserOperation via paymaster)
 */
export function getRefundType(intent: Intent): RefundType {
  return intent.intentType === "DEPOSIT" ? "deposit" : "withdrawal";
}

/**
 * Get the chain ID where the refund transaction must be executed.
 * - Deposit refund: origin chain (where funds are escrowed)
 * - Withdrawal refund: pool chain (where funds are escrowed)
 */
export function getRefundChainId(
  intent: Intent,
  poolChainId: number
): number {
  if (intent.intentType === "DEPOSIT") {
    return Number(intent.originChainId);
  }
  return poolChainId;
}

/**
 * Get time remaining until refund becomes available (in milliseconds).
 * Returns 0 if already refundable.
 */
export function getTimeUntilRefundable(intent: Intent): number {
  const expiresMs = Number(intent.expires) * 1000;
  return Math.max(0, expiresMs - Date.now());
}

/**
 * Extract the refund fee BPS from a withdrawal intent's refundCalldata.
 * Returns null for deposit intents (no refund fee) or if decoding fails.
 */
export function getRefundFeeBps(
  rawIntent: RawShinobiIntent | undefined
): number | null {
  if (!rawIntent?.refundCalldata || rawIntent.refundCalldata === "0x")
    return null;

  try {
    const fn = AbiFunction.fromAbi(HANDLE_REFUND_ABI, "handleRefund");
    const decoded = AbiFunction.decodeData(
      fn,
      rawIntent.refundCalldata as `0x${string}`
    );
    if (!decoded.args) return null;
    return Number(decoded.args[2]);
  } catch {
    return null;
  }
}

/**
 * Convert the indexer's raw intent struct to the contract tuple format.
 */
export function toContractIntentStruct(raw: RawShinobiIntent) {
  return {
    user: raw.user as `0x${string}`,
    nonce: BigInt(raw.nonce),
    originChainId: BigInt(raw.originChainId),
    expires: Number(raw.expires),
    fillDeadline: Number(raw.fillDeadline),
    fillOracle: raw.fillOracle as `0x${string}`,
    inputs: raw.inputs.map(
      ([tokenId, amount]) =>
        [BigInt(tokenId), BigInt(amount)] as [bigint, bigint]
    ),
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
 * Encode the refund calldata for the InputSettler.refund(intent) call.
 */
export function encodeRefundCallData(raw: RawShinobiIntent): `0x${string}` {
  const intentStruct = toContractIntentStruct(raw);
  const fn = AbiFunction.fromAbi(InputSettlerRefundAbi, "refund");
  return AbiFunction.encodeData(fn, [intentStruct]);
}

/**
 * Decode raw ABI-encoded ShinobiIntent (from Open event log.data) into RawShinobiIntent.
 */
export function decodeRawIntentData(
  rawIntentData: string
): RawShinobiIntent {
  const [decoded] = AbiParameters.decode(
    [
      {
        type: "tuple",
        components: ShinobiIntentComponents,
        name: "intent",
      },
    ],
    rawIntentData as `0x${string}`
  ) as [any];

  return {
    user: decoded.user,
    nonce: decoded.nonce.toString(),
    originChainId: decoded.originChainId.toString(),
    expires: String(decoded.expires),
    fillDeadline: String(decoded.fillDeadline),
    fillOracle: decoded.fillOracle,
    inputs: decoded.inputs.map(
      ([tokenId, amount]: [bigint, bigint]) =>
        [tokenId.toString(), amount.toString()] as [string, string]
    ),
    outputs: decoded.outputs.map(
      (o: {
        oracle: string;
        settler: string;
        chainId: bigint;
        token: string;
        amount: bigint;
        recipient: string;
        call: string;
        context: string;
      }) => ({
        oracle: o.oracle,
        settler: o.settler,
        chainId: o.chainId.toString(),
        token: o.token,
        amount: o.amount.toString(),
        recipient: o.recipient,
        call: o.call,
        context: o.context,
      })
    ),
    intentOracle: decoded.intentOracle,
    refundCalldata: decoded.refundCalldata,
  };
}
