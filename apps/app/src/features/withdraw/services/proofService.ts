/**
 * Proof Service
 *
 * Generates ZK proofs from circuit witness.
 */

import type { WithdrawalWitness, WithdrawalProof } from "../domain/types";
import { withdrawalProofGenerator } from "@/utils/WithdrawalProofGenerator";
import {
  buildWithdrawalCircuitWitness,
  buildCrosschainWithdrawalCircuitWitness,
} from "@shinobi-cash/core";

// ============ PUBLIC API ============

/**
 * Generate ZK proof from witness
 *
 * @param witness - Complete circuit witness
 * @returns Generated proof with public signals
 */
export async function generateProof(witness: WithdrawalWitness): Promise<WithdrawalProof> {
  const { context, stateTreeLeaves, aspTreeLeaves, circuitInputs } = witness;

  // Handle cross-chain and same-chain separately for type safety
  if (context.kind === "cross-chain") {
    // 1. Build cross-chain circuit witness
    const circuitWitness = buildCrosschainWithdrawalCircuitWitness(
      context.derivation as any,
      stateTreeLeaves,
      aspTreeLeaves,
      circuitInputs
    );

    // 2. Generate cross-chain proof
    const proofData = await withdrawalProofGenerator.generateCrosschainWithdrawalProof(
      circuitWitness
    );

    // 3. Return proof artifact
    return {
      witness,
      proof: proofData.proof,
      publicSignals: proofData.publicSignals,
    };
  } else {
    // 1. Build same-chain circuit witness
    const circuitWitness = buildWithdrawalCircuitWitness(
      context.derivation as any,
      stateTreeLeaves,
      aspTreeLeaves,
      circuitInputs
    );

    // 2. Generate same-chain proof
    const proofData = await withdrawalProofGenerator.generateWithdrawalProof(circuitWitness);

    // 3. Return proof artifact
    return {
      witness,
      proof: proofData.proof,
      publicSignals: proofData.publicSignals,
    };
  }
}
