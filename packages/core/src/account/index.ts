/**
 * @shinobi-cash/core/account
 *
 * Account-centric SDK API. Simple operations (deposit, ragequit, deposit refund)
 * return { to, data, value, chainId } that any wallet can send. Complex operations
 * (withdrawal) return prepared call data for bundler/UserOp submission.
 */

import {
  SHINOBI_CASH_ENTRYPOINT,
  POOL_CHAIN,
  FEE_CONFIG,
  SAME_CHAIN_GAS_LIMITS,
  CROSS_CHAIN_GAS_LIMITS,
  WITHDRAW2_SAME_CHAIN_GAS_LIMITS,
  WITHDRAW2_CROSS_CHAIN_GAS_LIMITS,
  WITHDRAWAL_REFUND_GAS_LIMITS,
  SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_WITHDRAW2_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAW2_PAYMASTER,
} from "@shinobi-cash/constants";

import {
  deriveDepositNullifier,
  deriveDepositSecret,
  derivePrecommitment,
  resolveDepositRoute,
  buildDepositCallParams,
  encodeDepositCallData,
} from "../deposit/index.js";

import {
  deriveWithdrawalInputs,
  deriveCrosschainWithdrawalInputs,
  deriveWithdraw2Inputs,
  deriveCrosschainWithdraw2Inputs,
  deriveRagequitInputs,
  createWithdrawalData,
  createCrossChainWithdrawalData,
  formatProofForContract,
  formatCrossChainProofForContract,
  formatWithdraw2SameChainProofForContract,
  formatWithdraw2CrossChainProofForContract,
  formatRagequitProofForContract,
  encodeRelayCallData,
  encodeCrossChainWithdrawalCallData,
  encodeWithdraw2RelayCallData,
  encodeCrossChainWithdraw2CallData,
  encodeRagequitCallData,
  derivedNoteCommitment,
} from "../withdrawal/index.js";

import {
  buildWithdrawalCircuitWitness,
  buildCrosschainWithdrawalCircuitWitness,
  buildWithdraw2CircuitWitness,
  buildCrosschainWithdraw2CircuitWitness,
  httpCircuitFetcher,
  createDefaultProofGenerator,
} from "../proof/index.js";

import {
  classifyWithdrawal,
  calculateFeesFromBPS,
  calculateTotalGas,
  calculateRelayFeeBPS,
  calculateSolverFeeBPS,
  type WithdrawalFeeQuote,
} from "../fees/index.js";

import { poseidon1 } from "poseidon-lite/poseidon1";
import { parseUserKey } from "../crypto/primitives.js";
import { deriveAndHashNullifier, deriveDepositPrecommitment } from "../discovery/nullifier-utils.js";
import type { SpendableNote } from "../discovery/types.js";
import { isSpendableNote } from "../discovery/types.js";

import { encodeRefundCallData } from "../intent/index.js";

import type {
  ShinobiAccount,
  ShinobiAccountConfig,
  TransactionRequest,
  PreparedWithdrawal,
  PreparedWithdrawalRefund,
  DepositParams,
  WithdrawParams,
  Withdraw2Params,
  RagequitParams,
  RefundDepositParams,
  WithdrawalRefundParams,
} from "./types.js";

export type {
  ShinobiAccount,
  ShinobiAccountConfig,
  ShinobiCredential,
  TransactionRequest,
  PreparedWithdrawal,
  PreparedWithdrawalRefund,
  WithdrawalFeeQuote,
  DepositParams,
  WithdrawQuoteParams,
  WithdrawParams,
  Withdraw2Params,
  RagequitParams,
  RefundDepositParams,
  WithdrawalRefundParams,
} from "./types.js";

const DEFAULT_DEPOSIT_SETTINGS = {
  solverFeeBPS: FEE_CONFIG.DEFAULT_SOLVER_FEE_BPS,
  fillDeadlineSeconds: 3600,
  expirySeconds: 7200,
};

export function createShinobiAccount(config: ShinobiAccountConfig): ShinobiAccount {
  const {
    credential,
    getCircuits,
  } = config;

  const proofGenerator = createDefaultProofGenerator(getCircuits ?? httpCircuitFetcher("/circuits/"));

  const { privateKey } = credential;
  const accountSecret = parseUserKey(privateKey);
  const accountId = poseidon1([accountSecret]).toString();

  // ========== Crypto Methods (accountSecret stays in closure) ==========

  function _derivePrecommitment(pool: string, chainId: number, depositIndex: number): string {
    return deriveDepositPrecommitment(accountSecret, pool, chainId, depositIndex);
  }

  function _deriveNullifierHash(pool: string, chainId: number, depositIndex: number, changeIndex: number, noteType?: string): string {
    return deriveAndHashNullifier(accountSecret, pool, chainId, depositIndex, changeIndex, noteType);
  }

  function _deriveNoteCommitment(note: SpendableNote): bigint {
    return derivedNoteCommitment(accountSecret, note);
  }

  // ========== Deposit ==========

  function deposit(params: DepositParams): TransactionRequest {
    const { poolAddress, amountWei, chainId, depositIndex, settings, useDefaults = true } = params;

    const nullifier = deriveDepositNullifier(accountSecret, poolAddress, chainId, depositIndex);
    const secret = deriveDepositSecret(accountSecret, poolAddress, chainId, depositIndex);
    const precommitment = derivePrecommitment(nullifier, secret);

    const route = resolveDepositRoute(chainId);
    const callParams = buildDepositCallParams(
      route,
      precommitment,
      settings ?? DEFAULT_DEPOSIT_SETTINGS,
      useDefaults,
    );
    const data = encodeDepositCallData(callParams);

    return { to: callParams.address, data, value: amountWei, chainId };
  }

  // ========== Withdrawal ==========

  async function prepareWithdrawal(params: WithdrawParams): Promise<PreparedWithdrawal> {
    const { poolAddress, note, amountWei, recipient, destinationChainId, gasPriceWei, poolScope, stateCommitments, aspLabels } = params;
    const poolChainId = POOL_CHAIN.id;
    const kind = classifyWithdrawal(destinationChainId, poolChainId);
    const isCrossChain = kind === "cross-chain";

    // Fee quote
    const gasLimits = isCrossChain ? CROSS_CHAIN_GAS_LIMITS : SAME_CHAIN_GAS_LIMITS;
    const totalGas = calculateTotalGas(gasLimits);
    const estimatedGasCostWei = totalGas * gasPriceWei;
    const relayFeeBPS = calculateRelayFeeBPS(amountWei, estimatedGasCostWei, FEE_CONFIG.MAX_RELAY_FEE_BPS);
    const solverFeeBPS = calculateSolverFeeBPS(kind);
    const { executionFeeWei, solverFeeWei, totalFeeWei } = calculateFeesFromBPS(amountWei, relayFeeBPS, solverFeeBPS);
    const netAmountWei = amountWei > totalFeeWei ? amountWei - totalFeeWei : 0n;
    const feeQuote: WithdrawalFeeQuote = { relayFeeBPS, solverFeeBPS, executionFeeWei, solverFeeWei, totalFeeWei, netAmountWei };

    const paymasterAddress = isCrossChain
      ? SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER.address as `0x${string}`
      : SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER.address as `0x${string}`;

    // Withdrawal data
    const withdrawalData = isCrossChain
      ? createCrossChainWithdrawalData(recipient, destinationChainId!, paymasterAddress, BigInt(solverFeeBPS))
      : createWithdrawalData(recipient, paymasterAddress, BigInt(relayFeeBPS));

    // Derive inputs
    const derivation = isCrossChain
      ? deriveCrosschainWithdrawalInputs(note, accountSecret, poolAddress, poolScope, withdrawalData)
      : deriveWithdrawalInputs(note, accountSecret, poolAddress, poolScope, withdrawalData);

    // Build circuit intent
    const circuitIntent = isCrossChain
      ? { withdrawAmount: amountWei, noteAmount: BigInt(note.amount), label: BigInt(note.label), relayFeeBPS: BigInt(relayFeeBPS), refundFeeBPS: BigInt(relayFeeBPS) }
      : { withdrawAmount: amountWei, noteAmount: BigInt(note.amount), label: BigInt(note.label) };

    // Build witness
    const circuitWitness = isCrossChain
      ? buildCrosschainWithdrawalCircuitWitness(derivation as Parameters<typeof buildCrosschainWithdrawalCircuitWitness>[0], stateCommitments, aspLabels, circuitIntent as Parameters<typeof buildCrosschainWithdrawalCircuitWitness>[3])
      : buildWithdrawalCircuitWitness(derivation as Parameters<typeof buildWithdrawalCircuitWitness>[0], stateCommitments, aspLabels, circuitIntent);

    // Generate proof
    const proofData = isCrossChain
      ? await proofGenerator.generateCrosschainWithdrawalProof(circuitWitness as Parameters<typeof proofGenerator.generateCrosschainWithdrawalProof>[0])
      : await proofGenerator.generateWithdrawalProof(circuitWitness);

    // Format proof and encode calldata
    const [processooor, data] = withdrawalData;
    const wd = { processooor, data };
    const callData = isCrossChain
      ? encodeCrossChainWithdrawalCallData(wd, formatCrossChainProofForContract(proofData.proof, proofData.publicSignals), poolScope)
      : encodeRelayCallData(wd, formatProofForContract(proofData.proof, proofData.publicSignals), poolScope);

    return {
      callData,
      to: SHINOBI_CASH_ENTRYPOINT.address as `0x${string}`,
      feeQuote,
      gasLimits,
      paymasterAddress,
      kind,
    };
  }

  // ========== Withdraw2 ==========

  async function prepareWithdraw2(params: Withdraw2Params): Promise<PreparedWithdrawal> {
    const { poolAddress, primaryNote, secondaryNote, amountWei, recipient, destinationChainId, gasPriceWei, poolScope, stateCommitments, aspLabels, labelSelector = 0 } = params;
    const poolChainId = POOL_CHAIN.id;
    const kind = classifyWithdrawal(destinationChainId, poolChainId);
    const isCrossChain = kind === "cross-chain";

    // Fee quote
    const gasLimits = isCrossChain ? WITHDRAW2_CROSS_CHAIN_GAS_LIMITS : WITHDRAW2_SAME_CHAIN_GAS_LIMITS;
    const totalGas = calculateTotalGas(gasLimits);
    const estimatedGasCostWei = totalGas * gasPriceWei;
    const relayFeeBPS = calculateRelayFeeBPS(amountWei, estimatedGasCostWei, FEE_CONFIG.MAX_RELAY_FEE_BPS);
    const solverFeeBPS = calculateSolverFeeBPS(kind);
    const { executionFeeWei, solverFeeWei, totalFeeWei } = calculateFeesFromBPS(amountWei, relayFeeBPS, solverFeeBPS);
    const netAmountWei = amountWei > totalFeeWei ? amountWei - totalFeeWei : 0n;
    const feeQuote: WithdrawalFeeQuote = { relayFeeBPS, solverFeeBPS, executionFeeWei, solverFeeWei, totalFeeWei, netAmountWei };

    const paymasterAddress = isCrossChain
      ? SHINOBI_CASH_CROSSCHAIN_WITHDRAW2_PAYMASTER.address as `0x${string}`
      : SHINOBI_CASH_WITHDRAW2_PAYMASTER.address as `0x${string}`;

    // Withdrawal data — use feeRecipient = paymaster for relay, solver fee for crosschain
    const withdrawalData = isCrossChain
      ? createCrossChainWithdrawalData(recipient, destinationChainId!, paymasterAddress, BigInt(solverFeeBPS))
      : createWithdrawalData(recipient, paymasterAddress, BigInt(relayFeeBPS));

    // Derive inputs
    const derivation = isCrossChain
      ? deriveCrosschainWithdraw2Inputs(primaryNote, secondaryNote, accountSecret, poolAddress, poolScope, withdrawalData, labelSelector)
      : deriveWithdraw2Inputs(primaryNote, secondaryNote, accountSecret, poolAddress, poolScope, withdrawalData, labelSelector);

    // Build circuit intent
    const circuitIntent = isCrossChain
      ? {
          withdrawAmount: amountWei,
          primaryNoteAmount: BigInt(primaryNote.amount),
          primaryLabel: BigInt(primaryNote.label),
          secondaryNoteAmount: BigInt(secondaryNote.amount),
          secondaryLabel: BigInt(secondaryNote.label),
          relayFeeBPS: BigInt(relayFeeBPS),
          refundFeeBPS: BigInt(relayFeeBPS),
        }
      : {
          withdrawAmount: amountWei,
          primaryNoteAmount: BigInt(primaryNote.amount),
          primaryLabel: BigInt(primaryNote.label),
          secondaryNoteAmount: BigInt(secondaryNote.amount),
          secondaryLabel: BigInt(secondaryNote.label),
        };

    // Build witness
    const circuitWitness = isCrossChain
      ? buildCrosschainWithdraw2CircuitWitness(derivation as Parameters<typeof buildCrosschainWithdraw2CircuitWitness>[0], stateCommitments, aspLabels, circuitIntent as Parameters<typeof buildCrosschainWithdraw2CircuitWitness>[3])
      : buildWithdraw2CircuitWitness(derivation as Parameters<typeof buildWithdraw2CircuitWitness>[0], stateCommitments, aspLabels, circuitIntent);

    // Generate proof
    const proofData = isCrossChain
      ? await proofGenerator.generateCrosschainWithdraw2Proof(circuitWitness as Parameters<typeof proofGenerator.generateCrosschainWithdraw2Proof>[0])
      : await proofGenerator.generateWithdraw2Proof(circuitWitness);

    // Format proof and encode calldata
    const [processooor, data] = withdrawalData;
    const wd = { processooor, data };
    const callData = isCrossChain
      ? encodeCrossChainWithdraw2CallData(wd, formatWithdraw2CrossChainProofForContract(proofData.proof, proofData.publicSignals), poolScope)
      : encodeWithdraw2RelayCallData(wd, formatWithdraw2SameChainProofForContract(proofData.proof, proofData.publicSignals), poolScope);

    return {
      callData,
      to: SHINOBI_CASH_ENTRYPOINT.address as `0x${string}`,
      feeQuote,
      gasLimits,
      paymasterAddress,
      kind,
    };
  }

  // ========== Ragequit ==========

  async function ragequit(params: RagequitParams): Promise<TransactionRequest> {
    const { poolAddress, note } = params;

    if (!isSpendableNote(note)) {
      throw new Error("Note is not spendable");
    }
    if (note.status !== "unspent") {
      throw new Error("Note is already spent");
    }

    const derivation = deriveRagequitInputs(note, accountSecret, poolAddress);

    const witness = {
      value: derivation.value.toString(),
      label: derivation.label.toString(),
      nullifier: derivation.existingNullifier.toString(),
      secret: derivation.existingSecret.toString(),
    };

    if (!proofGenerator.generateRagequitProof) {
      throw new Error("Ragequit proof generator not available");
    }
    const proofData = await proofGenerator.generateRagequitProof(witness);
    const contractProof = formatRagequitProofForContract(proofData.proof, proofData.publicSignals);
    const data = encodeRagequitCallData(contractProof);

    return {
      to: poolAddress,
      data,
      value: 0n,
      chainId: POOL_CHAIN.id,
    };
  }

  // ========== Refunds ==========

  function refundDeposit(params: RefundDepositParams): TransactionRequest {
    const { rawIntent, settlerAddress, originChainId } = params;
    const data = encodeRefundCallData(rawIntent);
    return { to: settlerAddress, data, value: 0n, chainId: originChainId };
  }

  function prepareWithdrawalRefund(params: WithdrawalRefundParams): PreparedWithdrawalRefund {
    const { rawIntent, settlerAddress } = params;
    const callData = encodeRefundCallData(rawIntent);
    return {
      callData,
      to: settlerAddress,
      gasLimits: WITHDRAWAL_REFUND_GAS_LIMITS,
      paymasterAddress: SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER.address as `0x${string}`,
    };
  }

  return {
    accountId,
    derivePrecommitment: _derivePrecommitment,
    deriveNullifierHash: _deriveNullifierHash,
    deriveNoteCommitment: _deriveNoteCommitment,
    deposit,
    prepareWithdrawal,
    prepareWithdraw2,
    ragequit,
    refundDeposit,
    prepareWithdrawalRefund,
  };
}
