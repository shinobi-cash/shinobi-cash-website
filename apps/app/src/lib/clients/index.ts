/**
 * Viem public client factory.
 * Used by RagequitController and RefundEngine for direct chain reads.
 */

import { createPublicClient, http } from "viem";
import { getViemChain } from "@/config/chains";

export function getPublicClient(chainId: number) {
  return createPublicClient({
    chain: getViemChain(chainId),
    transport: http(),
  });
}
