/**
 * Witness Service
 *
 * Builds ZK circuit witness from withdrawal context and external data.
 */

import type { WithdrawalPipelineContext, WithdrawalWitness, ExternalData } from "../domain/types";
import { fetchASPData, fetchStateTreeLeaves } from "@/services/data/indexerService";

// ============ EXTERNAL DATA FETCHING ============

/**
 * Fetch all external data required for witness building
 *
 * Note: poolScope is NOT fetched here - it comes from context.poolScope
 * which is the single source of truth.
 */
async function fetchExternalData(poolAddress: string): Promise<ExternalData> {
  const [stateTreeLeaves, aspData] = await Promise.all([
    fetchStateTreeLeaves(poolAddress),
    fetchASPData(),
  ]);

  return {
    stateTreeLeaves,
    aspData,
  };
}

// ============ PUBLIC API ============

/**
 * Build circuit witness for proof generation
 *
 * @param context - Withdrawal context with derivations
 * @returns Complete witness ready for proof generation
 */
export async function buildWitness(context: WithdrawalPipelineContext): Promise<WithdrawalWitness> {
  // 1. Fetch external data
  const externalData = await fetchExternalData(
    context.request.note.poolAddress.toLowerCase()
  );

  // 2. Convert state tree and ASP tree to bigint arrays
  const stateTreeLeaves = externalData.stateTreeLeaves.map((leaf) => BigInt(leaf.leafValue));
  const aspTreeLeaves = externalData.aspData.approvalList.map((label: string) => BigInt(label));

  // 3. Prepare circuit inputs
  const circuitInputs = {
    withdrawAmount: context.request.withdrawAmountWei,
    noteAmount: BigInt(context.request.note.amount),
    label: BigInt(context.request.note.label),
  };

  // 4. Return complete witness artifact
  return {
    context,
    stateTreeLeaves,
    aspTreeLeaves,
    circuitInputs,
  };
}
