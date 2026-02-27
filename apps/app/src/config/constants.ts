/**
 * Application Constants
 *
 * App-specific configuration values only.
 * For shared protocol constants (fees, addresses, ABIs), import directly from @shinobi-cash/constants
 */

import { POOL_CHAIN } from "@shinobi-cash/constants";

// ============ RELAYER CONFIG (App-Specific with Environment Variables) ============

export const RELAYER_URL = `https://api.pimlico.io/v2/${POOL_CHAIN.id}/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`;
