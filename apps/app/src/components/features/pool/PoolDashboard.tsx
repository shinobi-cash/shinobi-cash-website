import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import type { Activity } from "@shinobi-cash/data";
import { showToast } from "@/lib/toast";
import { fetchPoolStats } from "@/services/data/indexerService";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../ui/button";
import { ActivityDetailDrawer } from "./ActivityDetailDrawer";
import { ActivityRow } from "./ActivityRow";
import { PoolActions } from "./PoolActions";
import { PoolAssetSelector } from "./PoolAssetSelector";
import { PoolStatsCard } from "./PoolStatsCard";

interface PoolDashboardProps {
  activities: Activity[];
  loading?: boolean;
  error?: string;
  hasNextPage?: boolean;
  onFetchMore?: () => Promise<unknown>;
  onRefresh?: () => Promise<unknown>;
  isFetchingMore?: boolean;
}

const ETH_ASSET = {
  symbol: "ETH",
  name: "Ethereum",
  icon: "/ethereum.svg",
};

export function PoolDashboard({
  activities,
  loading,
  error,
  hasNextPage,
  onFetchMore,
  onRefresh,
  isFetchingMore,
}: PoolDashboardProps) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAsset] = useState(ETH_ASSET);

  // Pool stats
  const [poolStats, setPoolStats] = useState<{
    totalDeposits: string;
    totalWithdrawals: string;
    depositCount: number;
    createdAt: string;
  } | null>(null);
  const [poolStatsLoading, setPoolStatsLoading] = useState(true);
  const [poolStatsError, setPoolStatsError] = useState<Error | null>(null);

  const lastPoolStatsErrorRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { onTransactionIndexed } = useTransactionTracking();

  // Load pool stats
  const loadPoolStats = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setPoolStatsLoading(true);
      setPoolStatsError(null);

      try {
        const stats = await fetchPoolStats();
        setPoolStats(stats);
      } catch (error) {
        setPoolStatsError(error as Error);
        if (!isRefresh) {
          // Don't clear existing stats on refresh error
          setPoolStats((prev) => prev);
        }
      } finally {
        setPoolStatsLoading(false);
      }
    },
    [], // Empty deps - function doesn't depend on external state
  );

  useEffect(() => {
    loadPoolStats();
  }, [loadPoolStats]);

  // Show toast error
  useEffect(() => {
    const errorMessage = poolStatsError?.message || null;

    if (errorMessage && poolStats && errorMessage !== lastPoolStatsErrorRef.current) {
      showToast.error("Failed to refresh pool stats");
      lastPoolStatsErrorRef.current = errorMessage;
    } else if (!errorMessage) {
      lastPoolStatsErrorRef.current = null;
    }
  }, [poolStatsError?.message, poolStats]);

  // Auto-refresh on transaction indexed
  useEffect(() => {
    const cleanup = onTransactionIndexed(() => {
      onRefresh?.();
      loadPoolStats(true);
    });
    return cleanup;
  }, [onTransactionIndexed, onRefresh, loadPoolStats]);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    Promise.all([onRefresh?.(), loadPoolStats(true)]).finally(() => setIsRefreshing(false));
  };

  // Infinite scroll observer
  useEffect(() => {
    if (!onFetchMore || !hasNextPage || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingMore) {
          onFetchMore();
        }
      },
      {
        root: null,
        rootMargin: "20px",
        threshold: 0.5,
      },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [onFetchMore, hasNextPage, isFetchingMore]);

  const totalDeposits = poolStats?.totalDeposits ? BigInt(poolStats.totalDeposits) : BigInt(0);
  const totalWithdrawals = poolStats?.totalWithdrawals ? BigInt(poolStats.totalWithdrawals) : BigInt(0);
  const depositCount = poolStats?.depositCount || 0;

  return (
    <div className="flex flex-col h-full gap-3 sm:gap-4 p-3 sm:p-4 md:p-6">
      {/* Pool Overview */}
      <div className="space-y-3 sm:space-y-4">
        <PoolStatsCard totalDeposits={totalDeposits - totalWithdrawals}  depositCount={depositCount} loading={poolStatsLoading} />
        <PoolAssetSelector selectedAsset={selectedAsset} disabled={true} />
        <PoolActions asset={selectedAsset} />
      </div>

      {/* Recent Activity */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 bg-app-surface border border-app rounded-t-xl">
          <div className="flex items-center justify-between px-4 sm:px-5 md:px-6 py-2.5 sm:py-3">
            <h3 className="text-sm sm:text-base font-semibold text-app-secondary">Recent Activity</h3>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="h-8 w-8 p-0 text-app-secondary hover:text-app-primary"
                title="Refresh activity"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 bg-app-surface border-x border-b border-app rounded-b-xl overflow-hidden">
          <div className="h-full overflow-y-auto">
            {loading && activities.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-app-secondary">Loading activity...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-app-secondary mb-1">{error}</p>
                  <p className="text-sm text-app-tertiary">Check your connection and try again</p>
                </div>
              </div>
            ) : activities.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-app-secondary mb-1">No activity yet</p>
                  <p className="text-sm text-app-tertiary">Make your first deposit to get started</p>
                </div>
              </div>
            ) : (
              <>
                {activities.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => {
                      setSelectedActivity(activity);
                      setDrawerOpen(true);
                    }}
                    className="w-full text-left border-b border-app-border last:border-b-0 hover:bg-app-surface-hover transition-colors duration-200"
                  >
                    <ActivityRow activity={activity} />
                  </button>
                ))}

                {isFetchingMore && (
                  <div className="p-6 text-center text-app-tertiary text-sm">Loading more activities...</div>
                )}

                {hasNextPage && <div ref={sentinelRef} className="h-4 w-full" />}
              </>
            )}
          </div>
        </div>
      </div>

      <ActivityDetailDrawer activity={selectedActivity} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
