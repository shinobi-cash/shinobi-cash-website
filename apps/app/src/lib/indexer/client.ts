import { IndexerClient } from "@shinobi-cash/data";
import {
  INDEXER_REQUEST_TIMEOUT_MS,
  STATE_TREE_CACHE_TTL_SECONDS,
  ASP_ROOT_CACHE_TTL_SECONDS,
} from "@/constants/timings";

const INDEXER_ENDPOINT =
  process.env.NODE_ENV === "development"
    ? process.env.INDEXER_URL_DEV || "http://localhost:42069"
    : process.env.INDEXER_URL_PROD || "https://indexer.shinobi.cash";

const INDEXER_TOKEN =
  process.env.NODE_ENV === "development"
    ? process.env.INDEXER_TOKEN_DEV
    : process.env.INDEXER_TOKEN_PROD;

export const indexerClient = new IndexerClient({
  endpoint: INDEXER_ENDPOINT,
  authToken: INDEXER_TOKEN,
  timeout: INDEXER_REQUEST_TIMEOUT_MS,
});

export const CACHE_TTL = {
  activities: 2,
  stateTree: STATE_TREE_CACHE_TTL_SECONDS,
  aspLabels: ASP_ROOT_CACHE_TTL_SECONDS,
  health: 5,
} as const;
