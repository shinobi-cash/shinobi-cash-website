/**
 * Hook to fetch intent details by orderId
 * Used for getting fillDeadline and expires timestamps for pending intents
 */

import { useQuery } from "@tanstack/react-query";
import type { Intent } from "@shinobi-cash/data";
import { indexerClient } from "@/lib/indexer/client";

interface UseIntentDetailsOptions {
  /** Whether to enable the query */
  enabled?: boolean;
}

interface UseIntentDetailsResult {
  intent: Intent | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch intent details by orderId
 */
export function useIntentDetails(
  orderId: string | undefined,
  options: UseIntentDetailsOptions = {}
): UseIntentDetailsResult {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ["intent", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      return indexerClient.intent.getById(orderId);
    },
    enabled: enabled && !!orderId,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
  });

  return {
    intent: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
