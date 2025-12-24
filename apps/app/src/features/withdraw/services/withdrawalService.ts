/**
 * Withdrawal Service - Core Logic
 */

import {
  WITHDRAWAL_FEES,
  SHINOBI_CASH_ETH_POOL,
  SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER,
} from "@shinobi-cash/constants";
import { POOL_CHAIN_ID } from "@/config/chains";
import { WithdrawalProofGenerator } from "@/utils/WithdrawalProofGenerator";
import { parseEther } from "viem";
import {
  getCrosschainWithdrawalSmartAccountClient,
  getWithdrawalSmartAccountClient,
} from "@/lib/clients";
import {
  deriveChangeNullifier,
  deriveChangeSecret,
  deriveRefundNullifier,
  deriveRefundSecret,
  derivedNoteCommitment,
} from "@shinobi-cash/core";
import type { SmartAccountClient } from "permissionless";
import type { UserOperation } from "viem/account-abstraction";
import {
  type CrossChainWithdrawalData,
  type WithdrawalData,
  createCrossChainWithdrawalData,
  createWithdrawalData,
  encodeCrossChainWithdrawalCallData,
  encodeRelayCallData,
  executeWithdrawalUserOperation,
  fetchPoolScope,
  formatCrossChainProofForContract,
  formatProofForContract,
  prepareCrossChainWithdrawalUserOperation,
  prepareWithdrawalUserOperation,
} from "@/services/blockchain/contractService";
import { fetchASPData, fetchStateTreeLeaves } from "@/services/data/indexerService";
import type {
  WithdrawalRequest,
  WithdrawalContext,
  CrosschainWithdrawalContext,
  WithdrawalProofData,
  PreparedWithdrawal,
} from "./types";
import { calculateContextHash } from "./types";
import { deriveExistingNullifierAndSecret } from "./helpers";
import {
  WithdrawalError,
  WITHDRAWAL_ERROR_CODES,
  logError,
  wrapError,
  ErrorCategory,
} from "@/lib/errors";

// ============ DATA FETCHING ============

/**
 * Fetch all required withdrawal data in parallel
 */
async function fetchWithdrawalData(poolAddress: string) {
  const [stateTreeLeaves, aspData, poolScope] = await Promise.all([
    fetchStateTreeLeaves(poolAddress),
    fetchASPData(),
    fetchPoolScope(),
  ]);

  return { stateTreeLeaves, aspData, poolScope };
}

// ============ SAME-CHAIN WITHDRAWAL ============

/**
 * Calculate withdrawal context for same-chain withdrawal
 */
async function calculateWithdrawalContext(
  request: WithdrawalRequest,
  withdrawalData: { stateTreeLeaves: any; aspData: any; poolScope: string }
): Promise<WithdrawalContext> {
  const { note, recipientAddress, accountKey } = request;
  const { stateTreeLeaves, aspData, poolScope } = withdrawalData;

  // Create withdrawal data structure
  const withdrawalDataStruct = createWithdrawalData(
    recipientAddress,
    SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER.address,
    BigInt(500)
    // WITHDRAWAL_FEES.DEFAULT_RELAY_FEE_BPS
  );

  // Calculate context hash
  const context = calculateContextHash(withdrawalDataStruct, poolScope);

  const poolAddress = SHINOBI_CASH_ETH_POOL.address;

  // Generate new nullifier and secret for change note
  const newNullifier = deriveChangeNullifier(
    accountKey,
    poolAddress,
    note.depositIndex,
    note.changeIndex + 1
  );
  const newSecret = deriveChangeSecret(
    accountKey,
    poolAddress,
    note.depositIndex,
    note.changeIndex + 1
  );

  // Get existing nullifier and secret from note being spent
  const { existingNullifier, existingSecret } = deriveExistingNullifierAndSecret(accountKey, note);

  return {
    stateTreeLeaves,
    aspData,
    poolScope,
    withdrawalData: withdrawalDataStruct,
    context,
    newNullifier,
    newSecret,
    existingNullifier,
    existingSecret,
  };
}

/**
 * Generate ZK proof for same-chain withdrawal
 */
async function generateWithdrawalProof(
  request: WithdrawalRequest,
  context: WithdrawalContext
): Promise<WithdrawalProofData> {
  const { note, withdrawAmount } = request;
  const noteCommitment = derivedNoteCommitment(request.accountKey, note);
  const {
    stateTreeLeaves,
    aspData,
    context: contextHash,
    existingNullifier,
    existingSecret,
    newNullifier,
    newSecret,
  } = context;

  const prover = new WithdrawalProofGenerator();
  const withdrawalProof = await prover.generateWithdrawalProof({
    existingCommitmentHash: noteCommitment,
    existingValue: BigInt(note.amount),
    existingNullifier: BigInt(existingNullifier),
    existingSecret: BigInt(existingSecret),
    withdrawalValue: parseEther(withdrawAmount),
    context: contextHash,
    label: BigInt(note.label),
    newNullifier: BigInt(newNullifier),
    newSecret: BigInt(newSecret),
    stateTreeCommitments: stateTreeLeaves.map((leaf) => BigInt(leaf.leafValue)),
    aspTreeLabels: aspData.approvalList.map((label: string) => BigInt(label)),
  });

  return withdrawalProof;
}

/**
 * Prepare UserOperation for same-chain withdrawal
 */
async function prepareWithdrawalTransaction(
  context: WithdrawalContext,
  proofData: WithdrawalProofData
) {
  const { poolScope, withdrawalData } = context;

  // Format proof for contract
  const formattedProof = formatProofForContract(proofData.proof, proofData.publicSignals);

  // Create withdrawal data structure
  const withdrawalStruct: WithdrawalData = {
    processooor: withdrawalData[0] as `0x${string}`,
    data: withdrawalData[1] as `0x${string}`,
  };

  // Encode relay call data
  const relayCallData = encodeRelayCallData(withdrawalStruct, formattedProof, BigInt(poolScope));

  // Create smart account client and prepare UserOperation
  const smartAccountClient = await getWithdrawalSmartAccountClient();
  const userOperation = await prepareWithdrawalUserOperation(smartAccountClient, relayCallData);

  return { userOperation, smartAccountClient };
}

// ============ CROSS-CHAIN WITHDRAWAL ============

/**
 * Calculate withdrawal context for cross-chain withdrawal
 */
async function calculateCrossChainWithdrawalContext(
  request: WithdrawalRequest,
  withdrawalData: { stateTreeLeaves: any; aspData: any; poolScope: string }
): Promise<CrosschainWithdrawalContext> {
  const { note, recipientAddress, accountKey } = request;
  const { stateTreeLeaves, aspData, poolScope } = withdrawalData;

  // Create cross-chain withdrawal data structure
  const withdrawalDataStruct = createCrossChainWithdrawalData(
    recipientAddress,
    request.destinationChainId!,
    SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER.address,
    WITHDRAWAL_FEES.DEFAULT_RELAY_FEE_BPS
  );

  // Calculate context hash
  const context = calculateContextHash(withdrawalDataStruct, poolScope);

  const poolAddress = SHINOBI_CASH_ETH_POOL.address;

  // Generate new nullifier and secret for change note
  const newNullifier = deriveChangeNullifier(
    accountKey,
    poolAddress,
    note.depositIndex,
    note.changeIndex + 1
  );
  const newSecret = deriveChangeSecret(
    accountKey,
    poolAddress,
    note.depositIndex,
    note.changeIndex + 1
  );

  // Generate refund nullifier and secret for cross-chain withdrawal
  const refundNullifier = deriveRefundNullifier(
    accountKey,
    poolAddress,
    note.depositIndex,
    note.changeIndex + 1
  );
  const refundSecret = deriveRefundSecret(
    accountKey,
    poolAddress,
    note.depositIndex,
    note.changeIndex + 1
  );

  // Get existing nullifier and secret from note being spent
  const { existingNullifier, existingSecret } = deriveExistingNullifierAndSecret(accountKey, note);

  return {
    stateTreeLeaves,
    aspData,
    poolScope,
    withdrawalData: withdrawalDataStruct,
    context,
    newNullifier,
    newSecret,
    refundNullifier,
    refundSecret,
    existingNullifier,
    existingSecret,
  };
}

/**
 * Generate ZK proof for cross-chain withdrawal
 */
async function generateCrossChainWithdrawalProof(
  request: WithdrawalRequest,
  context: CrosschainWithdrawalContext
): Promise<WithdrawalProofData> {
  const { note, withdrawAmount } = request;
  const noteCommitment = derivedNoteCommitment(request.accountKey, note);
  const {
    stateTreeLeaves,
    aspData,
    context: contextHash,
    existingNullifier,
    existingSecret,
    newNullifier,
    newSecret,
    refundNullifier,
    refundSecret,
  } = context;

  const prover = new WithdrawalProofGenerator();
  const withdrawalProof = await prover.generateCrosschainWithdrawalProof({
    existingCommitmentHash: noteCommitment,
    existingValue: BigInt(note.amount),
    existingNullifier: BigInt(existingNullifier),
    existingSecret: BigInt(existingSecret),
    withdrawalValue: parseEther(withdrawAmount),
    context: contextHash,
    label: BigInt(note.label),
    newNullifier: BigInt(newNullifier),
    newSecret: BigInt(newSecret),
    refundNullifier: BigInt(refundNullifier),
    refundSecret: BigInt(refundSecret),
    stateTreeCommitments: stateTreeLeaves.map((leaf) => BigInt(leaf.leafValue)),
    aspTreeLabels: aspData.approvalList.map((label: string) => BigInt(label)),
  });

  return withdrawalProof;
}

/**
 * Prepare UserOperation for cross-chain withdrawal
 */
async function prepareCrossChainWithdrawalTransaction(
  context: CrosschainWithdrawalContext,
  proofData: WithdrawalProofData
) {
  const { poolScope, withdrawalData } = context;

  // Format proof for contract
  const formattedProof = formatCrossChainProofForContract(proofData.proof, proofData.publicSignals);

  // Create withdrawal data structure
  const withdrawalStruct: CrossChainWithdrawalData = {
    processooor: withdrawalData[0] as `0x${string}`,
    data: withdrawalData[1] as `0x${string}`,
  };

  // Encode cross-chain withdrawal call data
  const crossChainWithdrawalCallData = encodeCrossChainWithdrawalCallData(
    withdrawalStruct,
    formattedProof,
    BigInt(poolScope)
  );

  // Create smart account client and prepare UserOperation
  const smartAccountClient = await getCrosschainWithdrawalSmartAccountClient();
  const userOperation = await prepareCrossChainWithdrawalUserOperation(
    smartAccountClient,
    crossChainWithdrawalCallData
  );

  return { userOperation, smartAccountClient };
}

// ============ ORCHESTRATION ============

/**
 * Process withdrawal - orchestrates the entire withdrawal flow
 */
export async function processWithdrawal(request: WithdrawalRequest): Promise<PreparedWithdrawal> {
  // Check if this is a cross-chain withdrawal (defined outside try for error handling)
  const isCrossChain = request.destinationChainId && request.destinationChainId !== POOL_CHAIN_ID;

  try {
    // Step 1: Fetch all required data
    const withdrawalData = await fetchWithdrawalData(request.note.poolAddress.toLowerCase());

    // Step 2-4: Calculate context, generate proof, prepare transaction
    let context: WithdrawalContext | CrosschainWithdrawalContext;
    let proofData: WithdrawalProofData;
    let userOperation: UserOperation<"0.7">;
    let smartAccountClient: SmartAccountClient;

    if (isCrossChain) {
      // Cross-chain withdrawal flow
      const crossChainContext = await calculateCrossChainWithdrawalContext(request, withdrawalData);
      proofData = await generateCrossChainWithdrawalProof(request, crossChainContext);
      const result = await prepareCrossChainWithdrawalTransaction(crossChainContext, proofData);
      userOperation = result.userOperation;
      smartAccountClient = result.smartAccountClient;
      context = crossChainContext;
    } else {
      // Same-chain withdrawal flow
      const sameChainContext = await calculateWithdrawalContext(request, withdrawalData);
      proofData = await generateWithdrawalProof(request, sameChainContext);
      const result = await prepareWithdrawalTransaction(sameChainContext, proofData);
      userOperation = result.userOperation;
      smartAccountClient = result.smartAccountClient;
      context = sameChainContext;
    }

    return {
      context,
      proofData,
      userOperation,
      smartAccountClient,
    };
  } catch (error) {
    // Log with context for debugging
    logError(error, {
      action: "processWithdrawal",
      noteAmount: request.note.amount,
      withdrawAmount: request.withdrawAmount,
      isCrossChain,
    });

    // Transform to typed error with user-friendly message
    if (error instanceof Error && error.message.toLowerCase().includes("proof")) {
      throw new WithdrawalError(
        WITHDRAWAL_ERROR_CODES.PROOF_GENERATION_FAILED,
        "Failed to generate privacy proof. Please try again.",
        {
          cause: error,
          context: {
            noteAmount: request.note.amount,
            withdrawAmount: request.withdrawAmount,
          },
        }
      );
    }

    // If already a WithdrawalError, re-throw as-is
    if (error instanceof WithdrawalError) {
      throw error;
    }

    // Wrap unknown errors
    throw wrapError(
      error,
      ErrorCategory.WITHDRAWAL,
      WITHDRAWAL_ERROR_CODES.PREPARATION_FAILED,
      "Failed to prepare withdrawal. Please try again."
    );
  }
}

/**
 * Execute a prepared withdrawal
 */
export async function executeWithdrawal(
  smartAccountClient: SmartAccountClient,
  userOperation: UserOperation
): Promise<string> {
  return executeWithdrawalUserOperation(smartAccountClient, userOperation);
}

/**
 * Execute a prepared withdrawal (convenience wrapper)
 */
export async function executePreparedWithdrawal(
  preparedWithdrawal: PreparedWithdrawal
): Promise<string> {
  return executeWithdrawal(preparedWithdrawal.smartAccountClient, preparedWithdrawal.userOperation);
}
