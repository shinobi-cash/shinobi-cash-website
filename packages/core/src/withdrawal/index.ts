/**
 * @shinobi-cash/core/withdrawal
 */

import { encodeAbiParameters, encodeFunctionData, keccak256 } from 'viem/utils';
import { poseidon3 } from 'poseidon-lite/poseidon3';
import type { Note, DepositNote, ChangeNote } from '../discovery/types.js';
import { createDeriveFn, derivePrecommitment } from '../crypto/primitives.js';
import { SNARK_SCALAR_FIELD } from '../crypto/constants.js';
import { deriveDepositNullifier, deriveDepositSecret } from '../deposit/index.js';
import {
  EntrypointRelayAbi,
  EntrypointCrosschainWithdrawalAbi,
  SHINOBI_CASH_ENTRYPOINT,
} from '@shinobi-cash/constants';
import type {
  WithdrawalData,
  CrossChainWithdrawalData,
  ContractProof,
  ContractCrossChainProof,
  SnarkJsProof,
  ContextHash,
  WithdrawalDerivation,
  CrosschainWithdrawalDerivation,
} from './types.js';

// Re-export types
export type {
  WithdrawalData,
  CrossChainWithdrawalData,
  ContractProof,
  ContractCrossChainProof,
  SnarkJsProof,
  ContextHash,
  WithdrawalDerivation,
  CrosschainWithdrawalDerivation,
} from './types.js';

// ============ CONTRACT ENCODING ============

export function createWithdrawalData(
  recipientAddress: string,
  feeRecipient: string,
  relayFeeBPS: bigint,
): readonly [`0x${string}`, `0x${string}`] {
  return [
    SHINOBI_CASH_ENTRYPOINT.address,
    encodeAbiParameters(
      [
        { type: 'address', name: 'recipient' },
        { type: 'address', name: 'feeRecipient' },
        { type: 'uint256', name: 'relayFeeBPS' },
      ],
      [recipientAddress as `0x${string}`, feeRecipient as `0x${string}`, relayFeeBPS],
    ),
  ] as const;
}

export function createCrossChainWithdrawalData(
  recipientAddress: string,
  destinationChainId: number,
  feeRecipient: string,
  relayFeeBPS: bigint,
  solverFeeBPS: bigint,
): readonly [`0x${string}`, `0x${string}`] {
  const encodedDestination = (BigInt(destinationChainId) << BigInt(224)) | BigInt(recipientAddress);

  return [
    SHINOBI_CASH_ENTRYPOINT.address,
    encodeAbiParameters(
      [
        { type: 'address', name: 'feeRecipient' },
        { type: 'uint256', name: 'relayFeeBPS' },
        { type: 'uint256', name: 'solverFeeBPS' },
        { type: 'bytes32', name: 'encodedDestination' },
      ],
      [
        feeRecipient as `0x${string}`,
        relayFeeBPS,
        solverFeeBPS,
        `0x${encodedDestination.toString(16).padStart(64, '0')}`,
      ],
    ),
  ] as const;
}

/** Format snarkjs proof for Solidity verifier */
export function formatProofForContract(proof: SnarkJsProof, publicSignals: string[]): ContractProof {
  return {
    pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
    pB: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ],
    pC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
    pubSignals: [
      BigInt(publicSignals[0]),
      BigInt(publicSignals[1]),
      BigInt(publicSignals[2]),
      BigInt(publicSignals[3]),
      BigInt(publicSignals[4]),
      BigInt(publicSignals[5]),
      BigInt(publicSignals[6]),
      BigInt(publicSignals[7]),
    ],
  };
}

export function formatCrossChainProofForContract(
  proof: SnarkJsProof,
  publicSignals: string[],
): ContractCrossChainProof {
  return {
    pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
    pB: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ],
    pC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
    pubSignals: [
      BigInt(publicSignals[0]),
      BigInt(publicSignals[1]),
      BigInt(publicSignals[2]),
      BigInt(publicSignals[3]),
      BigInt(publicSignals[4]),
      BigInt(publicSignals[5]),
      BigInt(publicSignals[6]),
      BigInt(publicSignals[7]),
      BigInt(publicSignals[8]),
    ],
  };
}

export function encodeRelayCallData(
  withdrawalData: WithdrawalData,
  proof: ContractProof,
  scope: bigint,
): `0x${string}` {
  return encodeFunctionData({
    abi: EntrypointRelayAbi,
    functionName: 'relay',
    args: [
      { processooor: withdrawalData.processooor, data: withdrawalData.data },
      { pA: proof.pA, pB: proof.pB, pC: proof.pC, pubSignals: proof.pubSignals },
      scope,
    ],
  });
}

export function encodeCrossChainWithdrawalCallData(
  withdrawalData: CrossChainWithdrawalData,
  proof: ContractCrossChainProof,
  scope: bigint,
): `0x${string}` {
  return encodeFunctionData({
    abi: EntrypointCrosschainWithdrawalAbi,
    functionName: 'crosschainWithdrawal',
    args: [
      { processooor: withdrawalData.processooor, data: withdrawalData.data },
      { pA: proof.pA, pB: proof.pB, pC: proof.pC, pubSignals: proof.pubSignals },
      scope,
    ],
  });
}

// ============ DERIVATION FUNCTIONS ============

export const deriveChangeNullifier = createDeriveFn('shinobi.cash:ChangeNullifierV1');
export const deriveChangeSecret = createDeriveFn('shinobi.cash:ChangeSecretV1');
export const deriveRefundNullifier = createDeriveFn('shinobi.cash:RefundNullifierV1');
export const deriveRefundSecret = createDeriveFn('shinobi.cash:RefundSecretV1');

// ============ DERIVATION LOGIC ============

export function hashToBigInt(data: string): bigint {
  return BigInt(keccak256(data as `0x${string}`)) % SNARK_SCALAR_FIELD;
}

export function calculateContextHash(
  poolScope: bigint,
  withdrawalData: readonly [string, string],
): ContextHash {
  const encoded = encodeAbiParameters(
    [{ type: 'tuple', components: [{ type: 'address' }, { type: 'bytes' }] }, { type: 'uint256' }],
    [withdrawalData as readonly [`0x${string}`, `0x${string}`], poolScope],
  );
  return hashToBigInt(encoded).toString();
}

export function derivedNoteCommitment(accountKey: bigint, note: Note): bigint {
  let nullifier: bigint;
  let secret: bigint;

  if (note.changeIndex === 0) {
    nullifier = deriveDepositNullifier(accountKey, note.poolAddress, note.depositIndex);
    secret = deriveDepositSecret(accountKey, note.poolAddress, note.depositIndex);
  } else {
    nullifier = deriveChangeNullifier(accountKey, note.poolAddress, note.depositIndex, note.changeIndex);
    secret = deriveChangeSecret(accountKey, note.poolAddress, note.depositIndex, note.changeIndex);
  }

  return poseidon3([BigInt(note.amount), BigInt(note.label), derivePrecommitment(nullifier, secret)]);
}

export function deriveRefundCommitment(
  amount: bigint,
  label: bigint,
  refundNullifier: bigint,
  refundSecret: bigint,
): string {
  return poseidon3([amount, label, derivePrecommitment(refundNullifier, refundSecret)]).toString();
}

function deriveDepositWithdrawal(
  note: DepositNote,
  accountKey: bigint,
  poolAddress: string,
  poolScope: bigint,
  withdrawalData: readonly [string, string],
): WithdrawalDerivation {
  return {
    contextHash: calculateContextHash(poolScope, withdrawalData),
    existingNullifier: deriveDepositNullifier(accountKey, poolAddress, note.depositIndex),
    existingSecret: deriveDepositSecret(accountKey, poolAddress, note.depositIndex),
    newNullifier: deriveChangeNullifier(accountKey, poolAddress, note.depositIndex, 1),
    newSecret: deriveChangeSecret(accountKey, poolAddress, note.depositIndex, 1),
    existingCommitment: derivedNoteCommitment(accountKey, note).toString(),
  };
}

function deriveChangeWithdrawal(
  note: ChangeNote,
  accountKey: bigint,
  poolAddress: string,
  poolScope: bigint,
  withdrawalData: readonly [string, string],
): WithdrawalDerivation {
  return {
    contextHash: calculateContextHash(poolScope, withdrawalData),
    existingNullifier: deriveChangeNullifier(accountKey, poolAddress, note.depositIndex, note.changeIndex),
    existingSecret: deriveChangeSecret(accountKey, poolAddress, note.depositIndex, note.changeIndex),
    newNullifier: deriveChangeNullifier(accountKey, poolAddress, note.depositIndex, note.changeIndex + 1),
    newSecret: deriveChangeSecret(accountKey, poolAddress, note.depositIndex, note.changeIndex + 1),
    existingCommitment: derivedNoteCommitment(accountKey, note).toString(),
  };
}

export function deriveWithdrawalInputs(
  note: Note,
  accountKey: bigint,
  poolAddress: string,
  poolScope: bigint,
  withdrawalData: readonly [string, string],
): WithdrawalDerivation {
  if (note.noteType === 'deposit') {
    return deriveDepositWithdrawal(note, accountKey, poolAddress, poolScope, withdrawalData);
  } else if (note.noteType === 'change') {
    return deriveChangeWithdrawal(note, accountKey, poolAddress, poolScope, withdrawalData);
  }
  throw new Error('Cannot withdraw from refund note');
}

export function deriveCrosschainWithdrawalInputs(
  note: Note,
  accountKey: bigint,
  poolAddress: string,
  poolScope: bigint,
  withdrawalData: readonly [string, string],
): CrosschainWithdrawalDerivation {
  const base = deriveWithdrawalInputs(note, accountKey, poolAddress, poolScope, withdrawalData);
  const nextChangeIndex = note.noteType === 'deposit' ? 1 : note.changeIndex + 1;

  const refundNullifier = deriveRefundNullifier(accountKey, poolAddress, note.depositIndex, nextChangeIndex);
  const refundSecret = deriveRefundSecret(accountKey, poolAddress, note.depositIndex, nextChangeIndex);

  return {
    ...base,
    refundNullifier,
    refundSecret,
    refundCommitment: deriveRefundCommitment(BigInt(note.amount), BigInt(note.label), refundNullifier, refundSecret),
  };
}
