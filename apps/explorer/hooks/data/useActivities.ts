import type { Activity, PaginatedResponse } from "@shinobi-cash/data";
import { fetchActivities } from "@/services/data/indexerService";
import { useInfiniteQuery } from "@tanstack/react-query";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";

export function useActivities(poolId: string = SHINOBI_CASH_ETH_POOL.address, limit = 10) {
  return useInfiniteQuery<PaginatedResponse<Activity>, Error>({
    queryKey: ["activities", poolId],
    queryFn: ({ pageParam }) =>
      fetchActivities(poolId, limit, pageParam as number | undefined, "desc"),
    getNextPageParam: (lastPage, allPages) => {
      // Calculate next offset based on total items fetched
      const totalFetched = allPages.reduce((sum, page) => sum + page.items.length, 0);
      return lastPage.pageInfo.hasNextPage ? totalFetched : undefined;
    },
    initialPageParam: undefined, // ✅ required in React Query v5
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
