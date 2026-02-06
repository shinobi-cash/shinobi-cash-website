import type { Intent, IntentTimelineEvent } from "@shinobi-cash/data";
import { fetchIntentDetails } from "@/services/data/indexerService";
import { useQuery } from "@tanstack/react-query";

interface IntentDetails {
  intent: Intent;
  timeline: IntentTimelineEvent[];
}

export function useIntentDetails(orderId: string | undefined) {
  return useQuery<IntentDetails | null, Error>({
    queryKey: ["intentDetails", orderId],
    queryFn: () => {
      if (!orderId) return null;
      return fetchIntentDetails(orderId);
    },
    enabled: !!orderId,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    // Poll for updates if the intent is not finalized
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.intent) return false;
      // Stop polling if intent is in terminal state
      if (data.intent.phase === "FINALIZED" || data.intent.phase === "REFUNDED") {
        return false;
      }
      // Poll every 10 seconds for pending intents
      return 10_000;
    },
  });
}
