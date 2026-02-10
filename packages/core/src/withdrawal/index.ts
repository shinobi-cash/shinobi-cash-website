/**
 * @shinobi-cash/core/withdrawal
 */

import { encodeAbiParameters, encodeFunctionData, keccak256 } from 'viem/utils';
import { poseidon3 } from 'poseidon-lite/poseidon3';
import type { SpendableNote, DepositNote, CrosschainDepositNote, ChangeNote } from '../discovery/types.js';
import { createDeriveFn, derivePrecommitment } from '../crypto/primitives.js';
import { SNARK_SCALAR_FIELD } from '../crypto/constants.js';
import { deriveDepositNullifier, deriveDepositSecret } from '../deposit/index.js';
import {
  EntrypointRelayAbi,
  EntrypointCrosschainWithdrawalAbi,
  EntrypointWithdraw2RelayAbi,
  EntrypointCrosschainWithdraw2Abi,
  PoolRagequitAbi,
  SHINOBI_CASH_ENTRYPOINT,
  SHINOBI_CASH_ETH_POOL,
} from '@shinobi-cash/constants';
import type {
  WithdrawalData,
  CrossChainWithdrawalData,
  ContractProof,
  ContractCrossChainProof,
  ContractWithdraw2Proof,
  ContractWithdraw2SameChainProof,
  ContractCrosschainWithdraw2Proof,
  ContractRagequitProof,
  SnarkJsProof,
  ContextHash,
  WithdrawalDerivation,
  CrosschainWithdrawalDerivation,
  Withdraw2Derivation,
  Withdraw2PrimaryDerivation,
  Withdraw2SecondaryDerivation,
  CrosschainWithdraw2Derivation,
  RagequitDerivation,
} from './types.js';

// Re-export types
export type {
  WithdrawalData,
  CrossChainWithdrawalData,
  ContractProof,
  ContractCrossChainProof,
  ContractWithdraw2Proof,
  ContractWithdraw2SameChainProof,
  ContractCrosschainWithdraw2Proof,
  ContractRagequitProof,
  SnarkJsProof,
  ContextHash,
  WithdrawalDerivation,
  CrosschainWithdrawalDerivation,
  Withdraw2Derivation,
  Withdraw2PrimaryDerivation,
  Withdraw2SecondaryDerivation,
  CrosschainWithdraw2Derivation,
  RagequitDerivation,
} from './types.js';

// Re-export note selection
export {
  selectSingleNote,
  selectTwoNotes,
  selectNotesForWithdrawal,
  isWithdraw2Selection,
  getTotalInputAmount,
  getChangeNoteLabel,
} from './note-selection.js';
export type {
  WithdrawalType,
  SelectedNote,
  StandardWithdrawalSelection,
  Withdraw2Selection,
  WithdrawalSelection,
  SelectionError,
  SelectionResult,
} from './note-selection.js';

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

// ============ WITHDRAW2 (2:1) CONTRACT ENCODING ============

/**
 * Format snarkjs proof for same-chain Withdraw2 Solidity verifier (9 signals)
 *
 * Public signals order:
 * [0] newCommitmentHash - Change output commitment
 * [1] nullifierHash0 - Primary input nullifier (spent)
 * [2] nullifierHash1 - Secondary input nullifier (spent)
 * [3] withdrawnValue - Amount withdrawn
 * [4] stateRoot - State merkle root
 * [5] stateTreeDepth - State tree depth
 * [6] ASPRoot - ASP merkle root
 * [7] ASPTreeDepth - ASP tree depth
 * [8] context - Binding context hash
 */
export function formatWithdraw2SameChainProofForContract(
  proof: SnarkJsProof,
  publicSignals: string[],
): ContractWithdraw2SameChainProof {
  return {
    pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
    pB: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ],
    pC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
    pubSignals: [
      BigInt(publicSignals[0]), // newCommitmentHash
      BigInt(publicSignals[1]), // nullifierHash0
      BigInt(publicSignals[2]), // nullifierHash1
      BigInt(publicSignals[3]), // withdrawnValue
      BigInt(publicSignals[4]), // stateRoot
      BigInt(publicSignals[5]), // stateTreeDepth
      BigInt(publicSignals[6]), // ASPRoot
      BigInt(publicSignals[7]), // ASPTreeDepth
      BigInt(publicSignals[8]), // context
    ],
  };
}

/**
 * Format snarkjs proof for cross-chain Withdraw2 Solidity verifier (10 signals)
 *
 * Public signals order:
 * [0] newCommitmentHash - Change output commitment
 * [1] nullifierHash0 - Primary input nullifier (spent)
 * [2] nullifierHash1 - Secondary input nullifier (spent)
 * [3] refundCommitmentHash - Cross-chain refund commitment
 * [4] withdrawnValue - Amount withdrawn
 * [5] stateRoot - State merkle root
 * [6] stateTreeDepth - State tree depth
 * [7] ASPRoot - ASP merkle root
 * [8] ASPTreeDepth - ASP tree depth
 * [9] context - Binding context hash
 */
export function formatWithdraw2CrossChainProofForContract(
  proof: SnarkJsProof,
  publicSignals: string[],
): ContractCrosschainWithdraw2Proof {
  return {
    pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
    pB: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ],
    pC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
    pubSignals: [
      BigInt(publicSignals[0]), // newCommitmentHash
      BigInt(publicSignals[1]), // nullifierHash0
      BigInt(publicSignals[2]), // nullifierHash1
      BigInt(publicSignals[3]), // refundCommitmentHash
      BigInt(publicSignals[4]), // withdrawnValue
      BigInt(publicSignals[5]), // stateRoot
      BigInt(publicSignals[6]), // stateTreeDepth
      BigInt(publicSignals[7]), // ASPRoot
      BigInt(publicSignals[8]), // ASPTreeDepth
      BigInt(publicSignals[9]), // context
    ],
  };
}

/** @deprecated Use formatWithdraw2SameChainProofForContract or formatWithdraw2CrossChainProofForContract */
export function formatWithdraw2ProofForContract(
  proof: SnarkJsProof,
  publicSignals: string[],
): ContractWithdraw2Proof {
  return formatWithdraw2CrossChainProofForContract(proof, publicSignals);
}

export function encodeWithdraw2RelayCallData(
  withdrawalData: WithdrawalData,
  proof: ContractWithdraw2SameChainProof,
  scope: bigint,
): `0x${string}` {
  return encodeFunctionData({
    abi: EntrypointWithdraw2RelayAbi,
    functionName: 'relay2',
    args: [
      { processooor: withdrawalData.processooor, data: withdrawalData.data },
      { pA: proof.pA, pB: proof.pB, pC: proof.pC, pubSignals: proof.pubSignals },
      scope,
    ],
  });
}

export function encodeCrossChainWithdraw2CallData(
  withdrawalData: CrossChainWithdrawalData,
  proof: ContractCrosschainWithdraw2Proof,
  scope: bigint,
): `0x${string}` {
  return encodeFunctionData({
    abi: EntrypointCrosschainWithdraw2Abi,
    functionName: 'crosschainWithdrawal2',
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

export function derivedNoteCommitment(accountKey: bigint, note: SpendableNote): bigint {
  let nullifier: bigint;
  let secret: bigint;

  if (note.changeIndex === 0) {
    nullifier = deriveDepositNullifier(accountKey, note.poolAddress, note.originChainId, note.depositIndex);
    secret = deriveDepositSecret(accountKey, note.poolAddress, note.originChainId, note.depositIndex);
  } else {
    nullifier = deriveChangeNullifier(accountKey, note.poolAddress, note.originChainId, note.depositIndex, note.changeIndex);
    secret = deriveChangeSecret(accountKey, note.poolAddress, note.originChainId, note.depositIndex, note.changeIndex);
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
  note: DepositNote | CrosschainDepositNote,
  accountKey: bigint,
  poolAddress: string,
  poolScope: bigint,
  withdrawalData: readonly [string, string],
): WithdrawalDerivation {
  return {
    contextHash: calculateContextHash(poolScope, withdrawalData),
    existingNullifier: deriveDepositNullifier(accountKey, poolAddress, note.originChainId, note.depositIndex),
    existingSecret: deriveDepositSecret(accountKey, poolAddress, note.originChainId, note.depositIndex),
    newNullifier: deriveChangeNullifier(accountKey, poolAddress, note.originChainId, note.depositIndex, 1),
    newSecret: deriveChangeSecret(accountKey, poolAddress, note.originChainId, note.depositIndex, 1),
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
    existingNullifier: deriveChangeNullifier(accountKey, poolAddress, note.originChainId, note.depositIndex, note.changeIndex),
    existingSecret: deriveChangeSecret(accountKey, poolAddress, note.originChainId, note.depositIndex, note.changeIndex),
    newNullifier: deriveChangeNullifier(accountKey, poolAddress, note.originChainId, note.depositIndex, note.changeIndex + 1),
    newSecret: deriveChangeSecret(accountKey, poolAddress, note.originChainId, note.depositIndex, note.changeIndex + 1),
    existingCommitment: derivedNoteCommitment(accountKey, note).toString(),
  };
}

export function deriveWithdrawalInputs(
  note: SpendableNote,
  accountKey: bigint,
  poolAddress: string,
  poolScope: bigint,
  withdrawalData: readonly [string, string],
): WithdrawalDerivation {
  if (note.noteType === 'deposit' || note.noteType === 'crosschainDeposit') {
    return deriveDepositWithdrawal(note, accountKey, poolAddress, poolScope, withdrawalData);
  } else if (note.noteType === 'change') {
    return deriveChangeWithdrawal(note, accountKey, poolAddress, poolScope, withdrawalData);
  }
  throw new Error('Cannot withdraw from refund note');
}

export function deriveCrosschainWithdrawalInputs(
  note: SpendableNote,
  accountKey: bigint,
  poolAddress: string,
  poolScope: bigint,
  withdrawalData: readonly [string, string],
): CrosschainWithdrawalDerivation {
  const base = deriveWithdrawalInputs(note, accountKey, poolAddress, poolScope, withdrawalData);
  const nextChangeIndex = (note.noteType === 'deposit' || note.noteType === 'crosschainDeposit') ? 1 : note.changeIndex + 1;

  const refundNullifier = deriveRefundNullifier(accountKey, poolAddress, note.originChainId, note.depositIndex, nextChangeIndex);
  const refundSecret = deriveRefundSecret(accountKey, poolAddress, note.originChainId, note.depositIndex, nextChangeIndex);

  return {
    ...base,
    refundNullifier,
    refundSecret,
    refundCommitment: deriveRefundCommitment(BigInt(note.amount), BigInt(note.label), refundNullifier, refundSecret),
  };
}

// ============ WITHDRAW2 (2:1) DERIVATION FUNCTIONS ============

/**
 * Derive primary input values for Withdraw2 (the chain that continues)
 * Primary chain gets the change note output
 */
function derivePrimaryInput(
  note: SpendableNote,
  accountKey: bigint,
  poolAddress: string,
): Withdraw2PrimaryDerivation {
  const isDeposit = note.noteType === 'deposit' || note.noteType === 'crosschainDeposit';
  const nextChangeIndex = isDeposit ? 1 : note.changeIndex + 1;

  return {
    existingNullifier: isDeposit
      ? deriveDepositNullifier(accountKey, poolAddress, note.originChainId, note.depositIndex)
      : deriveChangeNullifier(accountKey, poolAddress, note.originChainId, note.depositIndex, note.changeIndex),
    existingSecret: isDeposit
      ? deriveDepositSecret(accountKey, poolAddress, note.originChainId, note.depositIndex)
      : deriveChangeSecret(accountKey, poolAddress, note.originChainId, note.depositIndex, note.changeIndex),
    existingCommitment: derivedNoteCommitment(accountKey, note).toString(),
    newNullifier: deriveChangeNullifier(accountKey, poolAddress, note.originChainId, note.depositIndex, nextChangeIndex),
    newSecret: deriveChangeSecret(accountKey, poolAddress, note.originChainId, note.depositIndex, nextChangeIndex),
  };
}

/**
 * Derive secondary input values for Withdraw2 (the chain that merges/terminates)
 * Secondary chain does NOT get a new nullifier/secret - it terminates
 */
function deriveSecondaryInput(
  note: SpendableNote,
  accountKey: bigint,
  poolAddress: string,
): Withdraw2SecondaryDerivation {
  const isDeposit = note.noteType === 'deposit' || note.noteType === 'crosschainDeposit';

  return {
    existingNullifier: isDeposit
      ? deriveDepositNullifier(accountKey, poolAddress, note.originChainId, note.depositIndex)
      : deriveChangeNullifier(accountKey, poolAddress, note.originChainId, note.depositIndex, note.changeIndex),
    existingSecret: isDeposit
      ? deriveDepositSecret(accountKey, poolAddress, note.originChainId, note.depositIndex)
      : deriveChangeSecret(accountKey, poolAddress, note.originChainId, note.depositIndex, note.changeIndex),
    existingCommitment: derivedNoteCommitment(accountKey, note).toString(),
  };
}

/**
 * Derive all inputs for a Withdraw2 (2:1 JoinSplit) withdrawal
 *
 * The primary note (larger depositIndex) continues with the change output.
 * The secondary note (smaller depositIndex) merges and terminates.
 *
 * @param primaryNote - The note with larger depositIndex (chain continues)
 * @param secondaryNote - The note with smaller depositIndex (chain terminates)
 * @param accountKey - User's account key for derivation
 * @param poolAddress - Pool contract address
 * @param poolScope - Pool scope value
 * @param withdrawalData - Encoded withdrawal data [processooor, data]
 * @param labelSelector - 0 to use primary's label, 1 to use secondary's label
 */
export function deriveWithdraw2Inputs(
  primaryNote: SpendableNote,
  secondaryNote: SpendableNote,
  accountKey: bigint,
  poolAddress: string,
  poolScope: bigint,
  withdrawalData: readonly [string, string],
  labelSelector: 0 | 1 = 0,
): Withdraw2Derivation {
  // Validate that primary has larger depositIndex
  if (primaryNote.depositIndex <= secondaryNote.depositIndex) {
    throw new Error('Primary note must have larger depositIndex than secondary note');
  }

  return {
    contextHash: calculateContextHash(poolScope, withdrawalData),
    primary: derivePrimaryInput(primaryNote, accountKey, poolAddress),
    secondary: deriveSecondaryInput(secondaryNote, accountKey, poolAddress),
    labelSelector,
  };
}

/**
 * Derive all inputs for a cross-chain Withdraw2 withdrawal
 *
 * Includes refund commitment for cross-chain failure recovery.
 * The refund commitment uses the selected label (based on labelSelector).
 *
 * @param primaryNote - The note with larger depositIndex (chain continues)
 * @param secondaryNote - The note with smaller depositIndex (chain terminates)
 * @param accountKey - User's account key for derivation
 * @param poolAddress - Pool contract address
 * @param poolScope - Pool scope value
 * @param withdrawalData - Encoded withdrawal data [processooor, data]
 * @param labelSelector - 0 to use primary's label, 1 to use secondary's label
 */
export function deriveCrosschainWithdraw2Inputs(
  primaryNote: SpendableNote,
  secondaryNote: SpendableNote,
  accountKey: bigint,
  poolAddress: string,
  poolScope: bigint,
  withdrawalData: readonly [string, string],
  labelSelector: 0 | 1 = 0,
): CrosschainWithdraw2Derivation {
  const base = deriveWithdraw2Inputs(
    primaryNote,
    secondaryNote,
    accountKey,
    poolAddress,
    poolScope,
    withdrawalData,
    labelSelector,
  );

  // Refund uses primary's chain position (since primary continues)
  const nextChangeIndex = (primaryNote.noteType === 'deposit' || primaryNote.noteType === 'crosschainDeposit') ? 1 : primaryNote.changeIndex + 1;

  const refundNullifier = deriveRefundNullifier(
    accountKey,
    poolAddress,
    primaryNote.originChainId,
    primaryNote.depositIndex,
    nextChangeIndex,
  );
  const refundSecret = deriveRefundSecret(
    accountKey,
    poolAddress,
    primaryNote.originChainId,
    primaryNote.depositIndex,
    nextChangeIndex,
  );

  // Refund commitment uses the selected label
  const selectedLabel =
    labelSelector === 0 ? BigInt(primaryNote.label) : BigInt(secondaryNote.label);

  // Refund amount is combined amount (both inputs)
  const refundAmount = BigInt(primaryNote.amount) + BigInt(secondaryNote.amount);

  return {
    ...base,
    refundNullifier,
    refundSecret,
    refundCommitment: deriveRefundCommitment(refundAmount, selectedLabel, refundNullifier, refundSecret),
  };
}

// ============ RAGEQUIT FUNCTIONS ============

/**
 * Format snarkjs proof for ragequit contract verifier (4 signals)
 *
 * Public signals order (from commitment circuit):
 * [0] commitmentHash - Hash of the commitment being ragequit
 * [1] nullifierHash - Hash of the nullifier
 * [2] value - Value of the commitment
 * [3] label - Deposit label
 */
export function formatRagequitProofForContract(
  proof: SnarkJsProof,
  publicSignals: string[],
): ContractRagequitProof {
  return {
    pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
    pB: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ],
    pC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
    pubSignals: [
      BigInt(publicSignals[0]), // commitmentHash
      BigInt(publicSignals[1]), // nullifierHash
      BigInt(publicSignals[2]), // value
      BigInt(publicSignals[3]), // label
    ],
  };
}

/**
 * Encode ragequit call data for the pool contract
 */
export function encodeRagequitCallData(proof: ContractRagequitProof): `0x${string}` {
  return encodeFunctionData({
    abi: PoolRagequitAbi,
    functionName: 'ragequit',
    args: [{ pA: proof.pA, pB: proof.pB, pC: proof.pC, pubSignals: proof.pubSignals }],
  });
}

/**
 * Derive ragequit inputs for a note
 * Simpler than withdrawal - no new commitment needed
 */
export function deriveRagequitInputs(
  note: SpendableNote,
  accountKey: bigint,
  poolAddress: string,
): RagequitDerivation {
  const isDeposit = note.noteType === 'deposit' || note.noteType === 'crosschainDeposit';

  const existingNullifier = isDeposit
    ? deriveDepositNullifier(accountKey, poolAddress, note.originChainId, note.depositIndex)
    : deriveChangeNullifier(accountKey, poolAddress, note.originChainId, note.depositIndex, note.changeIndex);

  const existingSecret = isDeposit
    ? deriveDepositSecret(accountKey, poolAddress, note.originChainId, note.depositIndex)
    : deriveChangeSecret(accountKey, poolAddress, note.originChainId, note.depositIndex, note.changeIndex);

  return {
    existingNullifier,
    existingSecret,
    existingCommitment: derivedNoteCommitment(accountKey, note).toString(),
    value: BigInt(note.amount),
    label: BigInt(note.label),
  };
}
