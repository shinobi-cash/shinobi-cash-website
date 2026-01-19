/**
 * Activity Screen Controller Hook
 *
 * Public UI-facing controller for the Activity feature.
 * Combines discovery + screen controllers.
 */

"use client";

import { useMemo } from "react";
import { useSnapshot } from "valtio";
import type { Activity, ActivityFilter, ActivityStatus } from "@/types/activity";
import { useActivityDiscovery } from "./useActivityDiscovery";
import { ActivityDiscoveryController } from "@/controllers/ActivityDiscoveryController";
import { ActivityScreenController } from "@/controllers/ActivityScreenController";
import { filterActivitiesByType } from "@/utils/activityDerivation";

// ============ PUBLIC API ============

export interface ActivityScreenControllerAPI {
  // Status
  status: ActivityStatus;

  // Data
  activities: readonly Activity[];
  filteredActivities: readonly Activity[];

  // Filter state
  activeFilter: ActivityFilter;
  setFilter: (filter: ActivityFilter) => void;

  // Counts
  totalCount: number;
  depositCount: number;
  withdrawalCount: number;
  refundCount: number;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
}

// ============ HOOK ============

export function useActivityScreen(): ActivityScreenControllerAPI {
  // Subscribe to discovery (domain)
  useActivityDiscovery();
  const discoverySnapshot = useSnapshot(ActivityDiscoveryController.state);

  // Subscribe to screen controller (UI)
  const screenState = useSnapshot(ActivityScreenController.state);

  // Canonical domain state
  const activities = discoverySnapshot.activities;
  const counts = discoverySnapshot.counts;
  const status = discoverySnapshot.status;

  // Apply filter (UI concern)
  const filteredActivities = useMemo(
    () => filterActivitiesByType(activities as Activity[], screenState.activeFilter),
    [activities, screenState.activeFilter]
  );

  return {
    // Status
    status,

    // Data
    activities,
    filteredActivities,

    // Filter
    activeFilter: screenState.activeFilter,
    setFilter: ActivityScreenController.setFilter,

    // Counts
    totalCount: counts.total,
    depositCount: counts.deposit,
    withdrawalCount: counts.withdrawal,
    refundCount: counts.refund,

    // Loading states (derived from status)
    isLoading: status.type === "loading",
    isRefreshing: status.type === "ready" && false, // reserved for future refresh semantics
  };
}
