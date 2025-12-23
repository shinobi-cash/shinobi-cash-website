/**
 * Withdrawal Service Types and Interfaces
 */

import type { StateTreeLeaf } from "@shinobi-cash/data";
import type { SmartAccountClient } from "permissionless";
import type { UserOperation } from "viem/account-abstraction";
import type { Note } from "@/lib/storage/types";
import { SNARK_SCALAR_FIELD } from "@shinobi-cash/constants";
import { encodeAbiParameters, keccak256 } from "viem";

// ============ REQUEST & RESPONSE TYPES ============

export interface WithdrawalRequest {
  note: Note;
  withdrawAmount: string;
  recipientAddress: string;
  accountKey: bigint;
  destinationChainId?: number;
}

export interface PreparedWithdrawal {
  context: WithdrawalContext | CrosschainWithdrawalContext;
  proofData: WithdrawalProofData;
  userOperation: UserOperation<"0.7">;
  smartAccountClient: SmartAccountClient;
}

// ============ CONTEXT TYPES ============

export interface WithdrawalContext {
  stateTreeLeaves: StateTreeLeaf[];
  aspData: ASPData;
  poolScope: string;
  withdrawalData: readonly [string, string];
  context: bigint;
  newNullifier: bigint;
  newSecret: bigint;
  existingNullifier: bigint;
  existingSecret: bigint;
}

export interface CrosschainWithdrawalContext {
  stateTreeLeaves: StateTreeLeaf[];
  aspData: ASPData;
  poolScope: string;
  withdrawalData: readonly [string, string];
  context: bigint;
  newNullifier: bigint;
  newSecret: bigint;
  refundNullifier: bigint;
  refundSecret: bigint;
  existingNullifier: bigint;
  existingSecret: bigint;
}

// ============ PROOF TYPES ============

export interface WithdrawalProofData {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  publicSignals: string[];
}

// ============ DATA TYPES ============

// Legacy ASPData type (will migrate to SDK later)
export type ASPData = {
  root: string;
  ipfsCID: string;
  timestamp: string;
  approvalList: string[];
};

// ============ UTILITY FUNCTIONS ============

/**
 * Hash data to BigInt using keccak256 and mod scalar field
 */
export function hashToBigInt(data: string): bigint {
  const hash = keccak256(data as `0x${string}`);
  return BigInt(hash) % BigInt(SNARK_SCALAR_FIELD);
}

/**
 * Calculate context hash from withdrawal data and pool scope
 */
export function calculateContextHash(
  withdrawalDataStruct: readonly [`0x${string}`, `0x${string}`],
  poolScope: string
): bigint {
  return hashToBigInt(
    encodeAbiParameters(
      [
        { type: "tuple", components: [{ type: "address" }, { type: "bytes" }] },
        { type: "uint256" },
      ],
      [withdrawalDataStruct, BigInt(poolScope)]
    )
  );
}
