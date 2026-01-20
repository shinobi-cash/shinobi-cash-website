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
  useActivityDiscovery();
  const discoverySnapshot = useSnapshot(ActivityDiscoveryController.state);
  const screenState = useSnapshot(ActivityScreenController.state);

  const activities = discoverySnapshot.activities;
  const counts = discoverySnapshot.counts;
  const status = discoverySnapshot.status;
  const syncError = discoverySnapshot.syncError;

  const filteredActivities = useMemo(
    () => filterActivitiesByType(activities as Activity[], screenState.activeFilter),
    [activities, screenState.activeFilter]
  );

  const selectedActivity = useMemo(() => {
    if (!screenState.selectedActivityId) return null;
    return (activities as Activity[]).find((a) => a.id === screenState.selectedActivityId) ?? null;
  }, [screenState.selectedActivityId, activities]);

  return {
    status,
    syncError,
    activities,
    filteredActivities,
    activeFilter: screenState.activeFilter,
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
