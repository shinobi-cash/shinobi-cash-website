/**
 * RagequitEngine - Orchestrates the ragequit (emergency exit) process
 *
 * Ragequit is simpler than withdrawal:
 * 1. No fee quotes or paymaster - user pays gas directly
 * 2. No merkle tree or ASP proof - just commitment proof
 * 3. Direct transaction to pool contract
 */

import type { Note, SpendableNote } from "@shinobi-cash/core/discovery";
import { isSpendableNote } from "@shinobi-cash/core/discovery";
import type { ContractRagequitProof, RagequitDerivation } from "@shinobi-cash/core/withdrawal";
import {
  deriveRagequitInputs,
  formatRagequitProofForContract,
  encodeRagequitCallData,
} from "@shinobi-cash/core/withdrawal";
import type { RagequitCircuitWitness, RagequitProofData } from "@shinobi-cash/core/proof";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { withdrawalProofGenerator } from "@/services/ProofGeneratorService";
import { getPublicClient } from "@/lib/clients";
import { Errors } from "@/lib/errors/errors";
import type { TransactionReceipt, WalletClient, Account, Transport, Chain } from "viem";

export type RagequitPhase =
  | "idle"
  | "deriving"
  | "proving"
  | "submitting"
  | "confirming"
  | "complete";

export interface RagequitRequest {
  note: Note;
  accountKey: bigint;
}

export interface RagequitResult {
  txHash: `0x${string}`;
  receipt: TransactionReceipt;
}

interface RagequitEngineState {
  phase: RagequitPhase;
  request: RagequitRequest | null;
  derivation: RagequitDerivation | null;
  proof: RagequitProofData | null;
  contractProof: ContractRagequitProof | null;
  result: RagequitResult | null;
}

export class RagequitEngine {
  private state: RagequitEngineState = {
    phase: "idle",
    request: null,
    derivation: null,
    proof: null,
    contractProof: null,
    result: null,
  };

  getState(): Readonly<RagequitEngineState> {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      phase: "idle",
      request: null,
      derivation: null,
      proof: null,
      contractProof: null,
      result: null,
    };
  }

  /**
   * Prepare the ragequit proof
   * This generates the ZK proof that can be submitted to the contract
   */
  async prepare(request: RagequitRequest): Promise<ContractRagequitProof> {
    this.reset();
    this.state.request = request;

    const note = request.note;

    // Validate note can be ragequit - must be a spendable note
    if (!isSpendableNote(note)) {
      throw Errors.withdrawal.precondition("Note is not a spendable note");
    }

    if (note.status !== "unspent") {
      throw Errors.withdrawal.precondition("Note is already spent");
    }

    if (BigInt(note.amount) <= BigInt(0)) {
      throw Errors.withdrawal.precondition("Note has no balance");
    }

    // 1. Derive ragequit inputs
    this.state.phase = "deriving";
    const derivation = deriveRagequitInputs(
      note as SpendableNote,
      request.accountKey,
      note.poolAddress,
    );
    this.state.derivation = derivation;

    // 2. Build witness for the commitment circuit
    const witness: RagequitCircuitWitness = {
      value: derivation.value.toString(),
      label: derivation.label.toString(),
      nullifier: derivation.existingNullifier.toString(),
      secret: derivation.existingSecret.toString(),
    };

    // 3. Generate proof
    this.state.phase = "proving";
    const proofGenerator = withdrawalProofGenerator;
    if (!proofGenerator.generateRagequitProof) {
      throw Errors.withdrawal.proofFailed("Ragequit proof generator not available");
    }

    const proof = await proofGenerator.generateRagequitProof(witness);
    this.state.proof = proof;

    // 4. Format for contract
    const contractProof = formatRagequitProofForContract(proof.proof, proof.publicSignals);
    this.state.contractProof = contractProof;

    return contractProof;
  }

  /**
   * Execute the ragequit transaction
   * Requires prepare() to have been called first
   *
   * @param walletClient - The connected wallet client (must be original depositor)
   */
  async execute(
    walletClient: WalletClient<Transport, Chain, Account>,
  ): Promise<RagequitResult> {
    if (!this.state.contractProof || !this.state.request) {
      throw Errors.withdrawal.precondition("Must call prepare() first");
    }

    const poolChainId = SHINOBI_CASH_ETH_POOL.chain.id;

    // Encode the ragequit call
    const callData = encodeRagequitCallData(this.state.contractProof);

    // Submit transaction - user pays gas
    this.state.phase = "submitting";
    const txHash = await walletClient.sendTransaction({
      to: SHINOBI_CASH_ETH_POOL.address,
      data: callData,
      chain: SHINOBI_CASH_ETH_POOL.chain,
    });

    // Wait for confirmation
    this.state.phase = "confirming";
    const publicClient = getPublicClient(poolChainId);
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });

    if (receipt.status === "reverted") {
      throw Errors.withdrawal.transactionFailed("Ragequit transaction reverted");
    }

    this.state.phase = "complete";
    this.state.result = { txHash, receipt };

    return this.state.result;
  }
}
