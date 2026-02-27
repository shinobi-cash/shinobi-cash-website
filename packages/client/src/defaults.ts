/**
 * Default PublicClient factory for all supported chains.
 * Uses viem public clients with default RPC URLs.
 */

import { createPublicClient, http, type PublicClient } from "viem";
import { SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import { getViemChain } from "./chains.js";

export function createDefaultPublicClients(): Record<number, PublicClient> {
  return Object.fromEntries(
    SHINOBI_CASH_SUPPORTED_CHAINS.map((c) => [
      c.id,
      createPublicClient({ chain: getViemChain(c.id), transport: http() }),
    ]),
  );
}
