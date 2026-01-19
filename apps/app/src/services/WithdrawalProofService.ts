import type { WithdrawalWitness, WithdrawalProof } from "@/types/withdrawal";
import { withdrawalProofGenerator } from "@/services/ProofGeneratorService";
import {
  buildWithdrawalCircuitWitness,
  buildCrosschainWithdrawalCircuitWitness,
} from "@shinobi-cash/core";

export async function generateProof(witness: WithdrawalWitness): Promise<WithdrawalProof> {
  const { context, stateTreeLeaves, aspTreeLeaves, circuitInputs } = witness;

  if (context.kind === "cross-chain") {
    const circuitWitness = buildCrosschainWithdrawalCircuitWitness(
      context.derivation as any,
      stateTreeLeaves,
      aspTreeLeaves,
      circuitInputs
    );
    const proofData =
      await withdrawalProofGenerator.generateCrosschainWithdrawalProof(circuitWitness);
    return { witness, proof: proofData.proof, publicSignals: proofData.publicSignals };
  }

  const circuitWitness = buildWithdrawalCircuitWitness(
    context.derivation as any,
    stateTreeLeaves,
    aspTreeLeaves,
    circuitInputs
  );
  const proofData = await withdrawalProofGenerator.generateWithdrawalProof(circuitWitness);
  return { witness, proof: proofData.proof, publicSignals: proofData.publicSignals };
}
