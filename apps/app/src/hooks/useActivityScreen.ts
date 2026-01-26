/**
 * Activity Screen Controller Hook
 *
 * Uses selective subscriptions to minimize re-renders:
 * - Only accesses specific properties from each controller
 * - Prevents cascading re-renders from unrelated state changes
 */

"use client";

import { useMemo } from "react";
import { useSnapshot } from "valtio";
import type { Activity, ActivityFilter, ActivityStatus } from "@/types/activity";
import { useActivityDiscovery } from "./useActivityDiscovery";
import { ActivityDiscoveryController } from "@/controllers/ActivityDiscoveryController";
import { ActivityScreenController } from "@/controllers/ActivityScreenController";
import { filterActivitiesByType } from "@/utils/activityDerivation";

export interface ActivityScreenControllerAPI {
  status: ActivityStatus;
  syncError: string | null; // Set when we have cached data but sync failed
  activities: readonly Activity[];
  filteredActivities: readonly Activity[];
  activeFilter: ActivityFilter;
  setFilter: (filter: ActivityFilter) => void;
  selectedActivity: Activity | null;
  selectActivity: (activityId: string) => void;
  clearSelection: () => void;
  totalCount: number;
  depositCount: number;
  withdrawalCount: number;
  refundCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
}

export function useActivityScreen(): ActivityScreenControllerAPI {
  // Trigger activity derivation from notes (side effect)
  useActivityDiscovery();

  // Selective subscriptions - only access what's needed
  // This prevents re-renders from unrelated state changes
  const { activities, counts, status, syncError } = useSnapshot(ActivityDiscoveryController.state);
  const { activeFilter, selectedActivityId } = useSnapshot(ActivityScreenController.state);

  const filteredActivities = useMemo(
    () => filterActivitiesByType(activities as Activity[], activeFilter),
    [activities, activeFilter]
  );

  const selectedActivity = useMemo(() => {
    if (!selectedActivityId) return null;
    return (activities as Activity[]).find((a) => a.id === selectedActivityId) ?? null;
  }, [selectedActivityId, activities]);

  return {
    status,
    syncError,
    activities,
    filteredActivities,
    activeFilter,
    setFilter: ActivityScreenController.setFilter,
    selectedActivity,
    selectActivity: ActivityScreenController.selectActivity,
    clearSelection: ActivityScreenController.clearSelection,
    totalCount: counts.total,
    depositCount: counts.deposit,
    withdrawalCount: counts.withdrawal,
    refundCount: counts.refund,
    isLoading: status.type === "loading",
    isRefreshing: false,
  };
}
