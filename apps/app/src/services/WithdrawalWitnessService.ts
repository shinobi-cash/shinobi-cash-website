import type {
  WithdrawalPipelineContext,
  WithdrawalWitness,
  ExternalData,
} from "@/types/withdrawal";
import { fetchASPData, fetchStateTreeLeaves } from "@/services/IndexerService";

async function fetchExternalData(poolAddress: string): Promise<ExternalData> {
  const [stateTreeLeaves, aspData] = await Promise.all([
    fetchStateTreeLeaves(poolAddress),
    fetchASPData(),
  ]);
  return { stateTreeLeaves, aspData };
}

export async function buildWitness(context: WithdrawalPipelineContext): Promise<WithdrawalWitness> {
  const externalData = await fetchExternalData(context.request.note.poolAddress.toLowerCase());
  const stateTreeLeaves = externalData.stateTreeLeaves.map((leaf) => BigInt(leaf.leafValue));
  const aspTreeLeaves = externalData.aspData.approvalList.map((label: string) => BigInt(label));

  const circuitInputs = {
    withdrawAmount: context.request.withdrawAmountWei,
    noteAmount: BigInt(context.request.note.amount),
    label: BigInt(context.request.note.label),
  };

  return { context, stateTreeLeaves, aspTreeLeaves, circuitInputs };
}
