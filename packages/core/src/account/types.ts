/**
 * @shinobi-cash/core/account — Type definitions
 *
 * ShinobiAccount = protocol encoder. Given pre-built inputs, derives crypto,
 * generates proofs, returns Call { to, value, data }. Zero knowledge of
 * indexer, bundler, solver, IPFS, fees, paymasters, gas limits.
 */

import type { SpendableNote } from "../discovery/types.js";
import type { CircuitFetcher, PrecomputedASPProof } from "../proof/types.js";
import type { DepositSettings } from "../deposit/index.js";

// ============================================================================
// Credential
// ============================================================================

export type ShinobiCredential = { type: "privateKey"; privateKey: string };

// ============================================================================
// Config
// ============================================================================

export interface ShinobiAccountConfig {
  credential: ShinobiCredential;
  /** Optional circuit file fetcher — defaults to HTTP from `/circuits/` */
  getCircuits?: CircuitFetcher;
}

// ============================================================================
// Return Type
// ============================================================================

/** Protocol action encoded as a contract call — any wallet or bundler can send */
export interface Call {
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
}

// ============================================================================
// Encode Params
// ============================================================================

export interface EncodeDepositParams {
  poolAddress: `0x${string}`;
  amountWei: bigint;
  depositIndex: number;
}

export interface EncodeCrosschainDepositParams {
  poolAddress: `0x${string}`;
  amountWei: bigint;
  chainId: number;
  depositIndex: number;
  settings?: DepositSettings;
  useDefaults?: boolean;
}

export interface EncodeWithdrawalParams {
  note: SpendableNote;
  poolAddress: `0x${string}`;
  poolScope: bigint;
  stateCommitments: bigint[];
  aspProof: PrecomputedASPProof;
  withdrawalData: readonly [`0x${string}`, `0x${string}`];
  amountWei: bigint;
  isCrossChain: boolean;
  relayFeeBPS?: bigint;
  refundFeeBPS?: bigint;
}

export interface EncodeWithdraw2Params {
  primaryNote: SpendableNote;
  secondaryNote: SpendableNote;
  poolAddress: `0x${string}`;
  poolScope: bigint;
  stateCommitments: bigint[];
  primaryASPProof: PrecomputedASPProof;
  secondaryASPProof: PrecomputedASPProof;
  withdrawalData: readonly [`0x${string}`, `0x${string}`];
  amountWei: bigint;
  labelSelector?: 0 | 1;
  isCrossChain: boolean;
  relayFeeBPS?: bigint;
  refundFeeBPS?: bigint;
}

export interface EncodeRagequitParams {
  note: SpendableNote;
  poolAddress: `0x${string}`;
}

export interface EncodeRefundParams {
  rawIntent: import("@shinobi-cash/data").RawShinobiIntent;
  settlerAddress: `0x${string}`;
}

// ============================================================================
// ShinobiAccount Interface
// ============================================================================

export interface ShinobiAccount {
  readonly accountId: string;

  // Crypto derivations (accountSecret stays in closure)
  derivePrecommitment(poolAddress: string, chainId: number, depositIndex: number): string;
  deriveNullifierHash(
    poolAddress: string,
    chainId: number,
    depositIndex: number,
    changeIndex: number,
    noteType?: string
  ): string;
  deriveNoteCommitment(note: SpendableNote): bigint;

  // Encode protocol actions → Call
  encodeDeposit(params: EncodeDepositParams): Call;
  encodeCrosschainDeposit(params: EncodeCrosschainDepositParams): Call;
  encodeWithdrawal(params: EncodeWithdrawalParams): Promise<Call>;
  encodeWithdraw2(params: EncodeWithdraw2Params): Promise<Call>;
  encodeRagequit(params: EncodeRagequitParams): Promise<Call>;
  encodeRefund(params: EncodeRefundParams): Call;
}
