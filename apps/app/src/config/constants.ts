/**
 * Application Constants
 *
 * App-specific configuration values only.
 * For shared protocol constants (fees, addresses, ABIs), import directly from @shinobi-cash/constants
 */

import { POOL_CHAIN } from "@shinobi-cash/constants";

// ============ INDEXER CONSTANTS (App-Specific) ============

/**
 * GraphQL and indexer configuration
 * NOTE: All indexer queries are now proxied through /api/indexer for security
 * This prevents API tokens from being exposed in the client bundle
 */
export const INDEXER_FETCH_POLICY = "network-only";

// ============ BUNDLER CONFIG (App-Specific with Environment Variables) ============

export const BUNDLER_URL = `https://api.pimlico.io/v2/${POOL_CHAIN.id}/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`;
