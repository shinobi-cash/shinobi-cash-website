/**
 * Withdrawal Contract Utilities
 *
 * Pure functions for encoding withdrawal contract calls.
 * These are framework-agnostic and can be used by any app.
 */

import { encodeAbiParameters, encodeFunctionData } from 'viem/utils';
import {
  EntrypointRelayAbi,
  EntrypointCrosschainWithdrawalAbi,
  SHINOBI_CASH_ENTRYPOINT,
} from '@shinobi-cash/constants';

/**
 * Withdrawal data for contract calls
 * Note: "processooor" spelling matches the contract ABI
 */
export interface WithdrawalData {
  processooor: `0x${string}`;
  data: `0x${string}`;
}

/**
 * Cross-chain withdrawal data for contract calls
 */
export interface CrossChainWithdrawalData {
  processooor: `0x${string}`;
  data: `0x${string}`;
}

/**
 * Contract-ready Groth16 proof format
 * pubSignals: [nullifier, newNoteCommitment, newAmount, newLabel, recipient, relayData, aspRoot, scope]
 */
export interface ContractProof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}

/**
 * Cross-chain contract-ready proof (9 signals - extra refundNullifier at [8])
 */
export interface ContractCrossChainProof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}

/**
 * Raw snarkjs proof format
 */
export interface SnarkJsProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}

/**
 * Create withdrawal data tuple for same-chain withdrawal
 *
 * @param recipientAddress - Address to receive withdrawal
 * @param feeRecipient - Address to receive relay fees
 * @param relayFeeBPS - Relay fee in basis points
 * @returns Tuple of [processooor address, encoded data]
 */
export function createWithdrawalData(
  recipientAddress: string,
  feeRecipient: string,
  relayFeeBPS: bigint
): readonly [`0x${string}`, `0x${string}`] {
  return [
    SHINOBI_CASH_ENTRYPOINT.address,
    encodeAbiParameters(
      [
        { type: 'address', name: 'recipient' },
        { type: 'address', name: 'feeRecipient' },
        { type: 'uint256', name: 'relayFeeBPS' },
      ],
      [recipientAddress as `0x${string}`, feeRecipient as `0x${string}`, relayFeeBPS]
    ),
  ] as const;
}

/**
 * Create withdrawal data tuple for cross-chain withdrawal
 *
 * @param recipientAddress - Address to receive withdrawal on destination chain
 * @param destinationChainId - Target chain ID
 * @param feeRecipient - Address to receive relay fees
 * @param relayFeeBPS - Relay fee in basis points
 * @param solverFeeBPS - Solver fee in basis points
 * @returns Tuple of [processooor address, encoded data]
 */
export function createCrossChainWithdrawalData(
  recipientAddress: string,
  destinationChainId: number,
  feeRecipient: string,
  relayFeeBPS: bigint,
  solverFeeBPS: bigint
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
      ]
    ),
  ] as const;
}

/**
 * Format snarkjs proof for Solidity verifier
 * Swaps pi_b coordinates for compatibility between snarkjs and Solidity
 *
 * @param proof - Raw snarkjs proof
 * @param publicSignals - Public signals array
 * @returns Contract-ready proof format
 */
export function formatProofForContract(
  proof: SnarkJsProof,
  publicSignals: string[]
): ContractProof {
  return {
    pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
    pB: [
      // Swap coordinates for pi_b - required for snarkjs/Solidity verifier compatibility
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

/**
 * Format snarkjs proof for cross-chain Solidity verifier
 *
 * @param proof - Raw snarkjs proof
 * @param publicSignals - Public signals array (9 elements)
 * @returns Contract-ready cross-chain proof format
 */
export function formatCrossChainProofForContract(
  proof: SnarkJsProof,
  publicSignals: string[]
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

/**
 * Encode relay call data for same-chain withdrawal
 *
 * @param withdrawalData - Withdrawal data from createWithdrawalData
 * @param proof - Contract-ready proof
 * @param scope - Pool scope
 * @returns Encoded call data for relay function
 */
export function encodeRelayCallData(
  withdrawalData: WithdrawalData,
  proof: ContractProof,
  scope: bigint
): `0x${string}` {
  return encodeFunctionData({
    abi: EntrypointRelayAbi,
    functionName: 'relay',
    args: [
      {
        processooor: withdrawalData.processooor,
        data: withdrawalData.data,
      },
      {
        pA: proof.pA,
        pB: proof.pB,
        pC: proof.pC,
        pubSignals: proof.pubSignals,
      },
      scope,
    ],
  });
}

/**
 * Encode call data for cross-chain withdrawal
 *
 * @param withdrawalData - Cross-chain withdrawal data
 * @param proof - Contract-ready cross-chain proof
 * @param scope - Pool scope
 * @returns Encoded call data for crosschainWithdrawal function
 */
export function encodeCrossChainWithdrawalCallData(
  withdrawalData: CrossChainWithdrawalData,
  proof: ContractCrossChainProof,
  scope: bigint
): `0x${string}` {
  return encodeFunctionData({
    abi: EntrypointCrosschainWithdrawalAbi,
    functionName: 'crosschainWithdrawal',
    args: [
      {
        processooor: withdrawalData.processooor,
        data: withdrawalData.data,
      },
      {
        pA: proof.pA,
        pB: proof.pB,
        pC: proof.pC,
        pubSignals: proof.pubSignals,
      },
      scope,
    ],
  });
}
