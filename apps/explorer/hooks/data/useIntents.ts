import type { Intent, PaginatedResponse } from "@shinobi-cash/data";
import { fetchIntents, type IntentFilters } from "@/services/data/indexerService";
import { useInfiniteQuery } from "@tanstack/react-query";

export function useIntents(limit = 10, filters: IntentFilters = {}) {
  return useInfiniteQuery<PaginatedResponse<Intent>, Error>({
    queryKey: ["intents", limit, filters],
    queryFn: ({ pageParam }) =>
      fetchIntents(limit, pageParam as number | undefined, "desc", filters),
    getNextPageParam: (lastPage, allPages) => {
      // Calculate next offset based on total items fetched
      const totalFetched = allPages.reduce((sum, page) => sum + page.items.length, 0);
      return lastPage.pageInfo.hasNextPage ? totalFetched : undefined;
    },
    initialPageParam: undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
