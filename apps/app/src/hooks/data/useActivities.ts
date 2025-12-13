import type { Activity, PaginatedResponse } from "@shinobi-cash/data";
import { fetchActivities } from "@/services/data/indexerService";
import { useInfiniteQuery } from "@tanstack/react-query";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";

export function useActivities(poolId: string = SHINOBI_CASH_ETH_POOL.address, limit = 10) {
  return useInfiniteQuery<PaginatedResponse<Activity>, Error>({
    queryKey: ["activities", poolId],
    queryFn: ({ pageParam }) => fetchActivities(poolId, limit, pageParam as string | undefined, "desc"),
    getNextPageParam: (lastPage) => (lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined),
    initialPageParam: undefined, // ✅ required in React Query v5
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
