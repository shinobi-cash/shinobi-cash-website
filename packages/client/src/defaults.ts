/**
 * Default PublicClient factory for all supported chains.
 * Uses viem public clients with default RPC URLs.
 */

import { createPublicClient, http, type PublicClient } from "viem";
import { SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import { getChain } from "@shinobi-cash/constants/chains";

export function createDefaultPublicClients(): Record<number, PublicClient> {
  return Object.fromEntries(
    SHINOBI_CASH_SUPPORTED_CHAINS.map((c) => [
      c.id,
      createPublicClient({ chain: getChain(c.id), transport: http() }),
    ])
  );
}
