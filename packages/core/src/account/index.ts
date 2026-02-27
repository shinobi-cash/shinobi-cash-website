/**
 * @shinobi-cash/core/account
 *
 * ShinobiAccount = protocol encoder. Given pre-built inputs, derives crypto,
 * generates proofs, returns Call { to, value, data }. Zero knowledge of
 * indexer, bundler, solver, IPFS, fees, paymasters, gas limits.
 */

import { SHINOBI_CASH_ENTRYPOINT, FEE_CONFIG, POOL_CHAIN } from "@shinobi-cash/constants";

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

import type { ProofGenerator } from "../proof/types.js";

import { poseidon1 } from "poseidon-lite/poseidon1";
import { parseUserKey } from "../crypto/primitives.js";
import { deriveAndHashNullifier, deriveDepositPrecommitment } from "../discovery/nullifier-utils.js";
import type { SpendableNote } from "../discovery/types.js";
import { isSpendableNote } from "../discovery/types.js";

import { encodeRefundCallData } from "../intent/index.js";

import type {
  ShinobiAccount,
  ShinobiAccountConfig,
  Call,
  EncodeDepositParams,
  EncodeCrosschainDepositParams,
  EncodeWithdrawalParams,
  EncodeWithdraw2Params,
  EncodeRagequitParams,
  EncodeRefundParams,
} from "./types.js";

export type {
  ShinobiAccount,
  ShinobiAccountConfig,
  ShinobiCredential,
  Call,
  EncodeDepositParams,
  EncodeCrosschainDepositParams,
  EncodeWithdrawalParams,
  EncodeWithdraw2Params,
  EncodeRagequitParams,
  EncodeRefundParams,
} from "./types.js";

const DEFAULT_DEPOSIT_SETTINGS = {
  solverFeeBPS: FEE_CONFIG.DEFAULT_SOLVER_FEE_BPS,
  fillDeadlineSeconds: 3600,
  expirySeconds: 7200,
};

export function createShinobiAccount(config: ShinobiAccountConfig): ShinobiAccount {
  const { credential, getCircuits } = config;

  // Proof module loaded lazily — only when encodeWithdrawal/encodeWithdraw2/encodeRagequit is called
  let _proofModule: typeof import("../proof/index.js") | null = null;
  async function loadProofModule() {
    if (!_proofModule) _proofModule = await import("../proof/index.js");
    return _proofModule;
  }

  let _proofGenerator: ProofGenerator | null = null;
  async function getProofGenerator() {
    if (!_proofGenerator) {
      const { createDefaultProofGenerator, httpCircuitFetcher } = await loadProofModule();
      _proofGenerator = createDefaultProofGenerator(getCircuits ?? httpCircuitFetcher("/circuits/"));
    }
    return _proofGenerator;
  }

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

  function _deriveDepositPrecommitment(poolAddress: string, chainId: number, depositIndex: number): bigint {
    const nullifier = deriveDepositNullifier(accountSecret, poolAddress, chainId, depositIndex);
    const secret = deriveDepositSecret(accountSecret, poolAddress, chainId, depositIndex);
    return derivePrecommitment(nullifier, secret);
  }

  function encodeDeposit(params: EncodeDepositParams): Call {
    const { poolAddress, amountWei, depositIndex } = params;

    const precommitment = _deriveDepositPrecommitment(poolAddress, POOL_CHAIN.id, depositIndex);
    const route = resolveDepositRoute(POOL_CHAIN.id);
    const callParams = buildDepositCallParams(route, precommitment, DEFAULT_DEPOSIT_SETTINGS, true);
    const data = encodeDepositCallData(callParams);

    return { to: callParams.address, data, value: amountWei };
  }

  function encodeCrosschainDeposit(params: EncodeCrosschainDepositParams): Call {
    const { poolAddress, amountWei, chainId, depositIndex, settings, useDefaults = true } = params;

    const precommitment = _deriveDepositPrecommitment(poolAddress, chainId, depositIndex);
    const route = resolveDepositRoute(chainId);
    const callParams = buildDepositCallParams(route, precommitment, settings ?? DEFAULT_DEPOSIT_SETTINGS, useDefaults);
    const data = encodeDepositCallData(callParams);

    return { to: callParams.address, data, value: amountWei };
  }

  // ========== Withdrawal ==========

  async function encodeWithdrawal(params: EncodeWithdrawalParams): Promise<Call> {
    const { note, poolAddress, poolScope, stateCommitments, aspProof, withdrawalData, amountWei, isCrossChain, relayFeeBPS, refundFeeBPS } = params;
    const [processooor, data] = withdrawalData;
    const wd = { processooor, data };
    const baseIntent = { withdrawAmount: amountWei, noteAmount: BigInt(note.amount), label: BigInt(note.label) };

    const proof = await loadProofModule();
    const pg = await getProofGenerator();

    let callData: `0x${string}`;
    if (isCrossChain) {
      const derivation = deriveCrosschainWithdrawalInputs(note, accountSecret, poolAddress, poolScope, withdrawalData);
      const witness = proof.buildCrosschainWithdrawalCircuitWitnessWithProof(
        derivation, stateCommitments, aspProof,
        { ...baseIntent, relayFeeBPS: relayFeeBPS!, refundFeeBPS: refundFeeBPS! },
      );
      const proofData = await pg.generateCrosschainWithdrawalProof(witness);
      callData = encodeCrossChainWithdrawalCallData(wd, formatCrossChainProofForContract(proofData.proof, proofData.publicSignals), poolScope);
    } else {
      const derivation = deriveWithdrawalInputs(note, accountSecret, poolAddress, poolScope, withdrawalData);
      const witness = proof.buildWithdrawalCircuitWitnessWithProof(derivation, stateCommitments, aspProof, baseIntent);
      const proofData = await pg.generateWithdrawalProof(witness);
      callData = encodeRelayCallData(wd, formatProofForContract(proofData.proof, proofData.publicSignals), poolScope);
    }

    return { to: SHINOBI_CASH_ENTRYPOINT.address as `0x${string}`, value: 0n, data: callData };
  }

  // ========== Withdraw2 ==========

  async function encodeWithdraw2(params: EncodeWithdraw2Params): Promise<Call> {
    const { primaryNote, secondaryNote, poolAddress, poolScope, stateCommitments, primaryASPProof, secondaryASPProof, withdrawalData, amountWei, labelSelector = 0, isCrossChain, relayFeeBPS, refundFeeBPS } = params;
    const [processooor, data] = withdrawalData;
    const wd = { processooor, data };
    const baseIntent = {
      withdrawAmount: amountWei,
      primaryNoteAmount: BigInt(primaryNote.amount),
      primaryLabel: BigInt(primaryNote.label),
      secondaryNoteAmount: BigInt(secondaryNote.amount),
      secondaryLabel: BigInt(secondaryNote.label),
    };

    const proof = await loadProofModule();
    const pg = await getProofGenerator();

    let callData: `0x${string}`;
    if (isCrossChain) {
      const derivation = deriveCrosschainWithdraw2Inputs(primaryNote, secondaryNote, accountSecret, poolAddress, poolScope, withdrawalData, labelSelector);
      const witness = proof.buildCrosschainWithdraw2CircuitWitnessWithProof(
        derivation, stateCommitments, primaryASPProof, secondaryASPProof,
        { ...baseIntent, relayFeeBPS: relayFeeBPS!, refundFeeBPS: refundFeeBPS! },
      );
      const proofData = await pg.generateCrosschainWithdraw2Proof(witness);
      callData = encodeCrossChainWithdraw2CallData(wd, formatWithdraw2CrossChainProofForContract(proofData.proof, proofData.publicSignals), poolScope);
    } else {
      const derivation = deriveWithdraw2Inputs(primaryNote, secondaryNote, accountSecret, poolAddress, poolScope, withdrawalData, labelSelector);
      const witness = proof.buildWithdraw2CircuitWitnessWithProof(derivation, stateCommitments, primaryASPProof, secondaryASPProof, baseIntent);
      const proofData = await pg.generateWithdraw2Proof(witness);
      callData = encodeWithdraw2RelayCallData(wd, formatWithdraw2SameChainProofForContract(proofData.proof, proofData.publicSignals), poolScope);
    }

    return { to: SHINOBI_CASH_ENTRYPOINT.address as `0x${string}`, value: 0n, data: callData };
  }

  // ========== Ragequit ==========

  async function encodeRagequit(params: EncodeRagequitParams): Promise<Call> {
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

    const pg = await getProofGenerator();
    if (!pg.generateRagequitProof) {
      throw new Error("Ragequit proof generator not available");
    }
    const proofData = await pg.generateRagequitProof(witness);
    const contractProof = formatRagequitProofForContract(proofData.proof, proofData.publicSignals);
    const data = encodeRagequitCallData(contractProof);

    return { to: poolAddress, value: 0n, data };
  }

  // ========== Refund ==========

  function encodeRefund(params: EncodeRefundParams): Call {
    const { rawIntent, settlerAddress } = params;
    const data = encodeRefundCallData(rawIntent);
    return { to: settlerAddress, value: 0n, data };
  }

  return {
    accountId,
    derivePrecommitment: _derivePrecommitment,
    deriveNullifierHash: _deriveNullifierHash,
    deriveNoteCommitment: _deriveNoteCommitment,
    encodeDeposit,
    encodeCrosschainDeposit,
    encodeWithdrawal,
    encodeWithdraw2,
    encodeRagequit,
    encodeRefund,
  };
}
