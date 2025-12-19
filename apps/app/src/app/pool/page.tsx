"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { useActivities } from "@/hooks/data/useActivities";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { PoolStatsCard } from "@/components/features/pool/PoolStatsCard";
import { PoolAssetSelector } from "@/components/features/pool/PoolAssetSelector";
import { ActivityRow } from "@/components/features/pool/ActivityRow";
import { ActivityDetailDrawer } from "@/components/features/pool/ActivityDetailDrawer";
import { Button } from "@workspace/ui/components/button";
import type { Activity } from "@shinobi-cash/data";
import { fetchPoolStats } from "@/services/data/indexerService";
import { showToast } from "@/lib/toast";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { Header } from "@/components/new/Header";
import { AnnouncementBar } from "@/components/new/AnnouncementBar";
import { Footer } from "@/components/new/Footer";
import { BottomNav } from "@/components/new/BottomNav";

const ETH_ASSET = {
  symbol: "ETH",
  name: "Ethereum",
  icon: "/ethereum.svg",
};

export default function PoolPage() {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAsset] = useState(ETH_ASSET);

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

  // Pool data
  const { data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useActivities(
    SHINOBI_CASH_ETH_POOL.address,
    10,
  );
  const activities = data?.pages.flatMap((page) => page.items) ?? [];

  const loadPoolStats = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setPoolStatsLoading(true);
    setPoolStatsError(null);

    try {
      const stats = await fetchPoolStats();
      setPoolStats(stats);
    } catch (error) {
      setPoolStatsError(error as Error);
      if (!isRefresh) {
        setPoolStats((prev) => prev);
      }
    } finally {
      setPoolStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPoolStats();
  }, [loadPoolStats]);

  useEffect(() => {
    const errorMessage = poolStatsError?.message || null;

    if (errorMessage && poolStats && errorMessage !== lastPoolStatsErrorRef.current) {
      showToast.error("Failed to refresh pool stats");
      lastPoolStatsErrorRef.current = errorMessage;
    } else if (!errorMessage) {
      lastPoolStatsErrorRef.current = null;
    }
  }, [poolStatsError?.message, poolStats]);

  useEffect(() => {
    const cleanup = onTransactionIndexed(() => {
      refetch();
      loadPoolStats(true);
    });
    return cleanup;
  }, [onTransactionIndexed, refetch, loadPoolStats]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    Promise.all([refetch(), loadPoolStats(true)]).finally(() => setIsRefreshing(false));
  };

  useEffect(() => {
    if (!fetchNextPage || !hasNextPage || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
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
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const totalDeposits = poolStats?.totalDeposits ? BigInt(poolStats.totalDeposits) : BigInt(0);
  const totalWithdrawals = poolStats?.totalWithdrawals ? BigInt(poolStats.totalWithdrawals) : BigInt(0);
  const depositCount = poolStats?.depositCount || 0;

  return (
    <div className="h-screen overflow-hidden bg-linear-to-br from-gray-900 via-gray-900 to-black flex flex-col">
      {/* Header */}
      <div className="shrink-0 p-4 sm:p-6">
        <Header />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 pb-20 md:pb-0">
        <div className="w-full md:max-w-2xl lg:max-w-4xl mx-auto">
          <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
            {/* Page Title */}
            <div className="shrink-0 border-b border-gray-800 px-6 py-4">
              <h1 className="text-2xl font-bold text-white">Pool Dashboard</h1>
              <p className="text-sm text-gray-400 mt-1">View pool statistics and recent activity</p>
            </div>

            {/* Pool Content */}
            <div className="flex flex-col h-full">
              {/* Fixed section - doesn't scroll */}
              <div className="shrink-0 space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6 pb-0">
                <PoolStatsCard
                  totalDeposits={totalDeposits - totalWithdrawals}
                  depositCount={depositCount}
                  loading={poolStatsLoading}
                />
                <PoolAssetSelector selectedAsset={selectedAsset} disabled={true} />
              </div>

              {/* Scrollable section - activity list only */}
              <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 md:p-6">
                <div className="shrink-0 bg-app-surface border border-app rounded-t-xl">
                  <div className="flex items-center justify-between px-4 sm:px-5 md:px-6 py-2.5 sm:py-3">
                    <h3 className="text-sm sm:text-base font-semibold text-app-secondary">Recent Activity</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={isRefreshing || isLoading}
                      className="h-8 w-8 p-0 text-app-secondary hover:text-app-primary"
                      title="Refresh activity"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 bg-app-surface border-x border-b border-app rounded-b-xl overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    {isLoading && activities.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-app-secondary">Loading activity...</p>
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <p className="text-app-secondary mb-1">Failed to load activities</p>
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

                        {isFetchingNextPage && (
                          <div className="p-6 text-center text-app-tertiary text-sm">Loading more activities...</div>
                        )}

                        {hasNextPage && <div ref={sentinelRef} className="h-4 w-full" />}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Desktop: Scenic bottom section with announcement & footer */}
      <div className="hidden md:block shrink-0 relative">
        {/* Background illustration placeholder */}
        <div className="h-32 sm:h-40 bg-linear-to-t from-gray-950 to-transparent" />

        {/* Announcement bar */}
        <AnnouncementBar />

        {/* Footer */}
        <Footer />
      </div>

      {/* Mobile: Bottom Navigation */}
      <BottomNav />

      <ActivityDetailDrawer activity={selectedActivity} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
