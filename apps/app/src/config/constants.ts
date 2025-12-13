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
 */
export const INDEXER_FETCH_POLICY = "network-only";

/**
 * Indexer endpoint configuration based on environment
 */
export const INDEXER_CONFIG = {
  ENDPOINT:
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_INDEXER_URL_DEV || "http://localhost:42069/proxy/graphql"
      : process.env.NEXT_PUBLIC_INDEXER_URL_PROD ||
        "https://api.thegraph.com/subgraphs/name/shinobi-cash/privacy-pools-v1",
  TOKEN:
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_INDEXER_TOKEN_DEV
      : process.env.NEXT_PUBLIC_INDEXER_TOKEN_PROD,
} as const;

// ============ BUNDLER CONFIG (App-Specific with Environment Variables) ============

export const BUNDLER_URL = `https://api.pimlico.io/v2/${POOL_CHAIN.id}/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`;
