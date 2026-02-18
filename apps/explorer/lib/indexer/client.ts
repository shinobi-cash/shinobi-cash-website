import { IndexerClient } from "@shinobi-cash/data";

const INDEXER_ENDPOINT =
  process.env.NODE_ENV === "development"
    ? process.env.INDEXER_URL_DEV || "http://localhost:42069"
    : process.env.INDEXER_URL_PROD || "http://localhost:42069";

const INDEXER_TOKEN =
  process.env.NODE_ENV === "development"
    ? process.env.INDEXER_TOKEN_DEV
    : process.env.INDEXER_TOKEN_PROD;

export const indexerClient = new IndexerClient({
  endpoint: INDEXER_ENDPOINT,
  authToken: INDEXER_TOKEN,
  timeout: 30000,
});

export const CACHE_TTL = {
  activities: 10,
  stateTree: 30,
  poolStats: 30,
  intents: 10,
} as const;
