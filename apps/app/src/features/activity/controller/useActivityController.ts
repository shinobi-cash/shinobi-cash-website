/**
 * Activity Controller
 *
 * UI-facing orchestrator for the activity feature.
 * Reads note chains from discovery session and derives activities.
 */

import { useMemo, useState, useCallback } from "react";
import { useNoteDiscoverySession } from "@/hooks/notes/useNoteDiscoverySession";
import type { Activity, ActivityFilter, ActivityStatus } from "../types";
import {
  deriveActivitiesFromNoteChains,
  filterActivitiesByType,
  getActivityCounts,
} from "../utils/deriveActivities";

// ============ TYPES ============

export interface ActivityController {
  // Status
  status: ActivityStatus;

  // Data
  activities: Activity[];
  filteredActivities: Activity[];

  // Filter state
  activeFilter: ActivityFilter;
  setFilter: (filter: ActivityFilter) => void;

  // Counts for filter tabs
  totalCount: number;
  depositCount: number;
  withdrawalCount: number;
  refundCount: number;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
}

// ============ CONTROLLER ============

export function useActivityController(): ActivityController {
  // Get note discovery session (same source as notes feature)
  const { discovery, cryptoReady } = useNoteDiscoverySession();

  // Filter state
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>("all");

  // ============ DERIVED STATE ============

  // Extract note chains from discovery
  const noteChains = useMemo(() => {
    return discovery.data?.notes ?? [];
  }, [discovery.data]);

  // Derive all activities from note chains
  const activities = useMemo(() => {
    return deriveActivitiesFromNoteChains(noteChains);
  }, [noteChains]);

  // Filter activities by active filter
  const filteredActivities = useMemo(() => {
    return filterActivitiesByType(activities, activeFilter);
  }, [activities, activeFilter]);

  // Calculate counts for filter tabs
  const counts = useMemo(() => {
    return getActivityCounts(activities);
  }, [activities]);

  // ============ STATUS MACHINE ============

  const status: ActivityStatus = !cryptoReady
    ? { type: "idle" }
    : discovery.discoveryError
      ? { type: "error", message: discovery.discoveryError }
      : discovery.isDiscovering && !discovery.data
        ? { type: "loading" }
        : activities.length === 0
          ? { type: "empty" }
          : { type: "ready" };

  // ============ ACTIONS ============

  const setFilter = useCallback((filter: ActivityFilter) => {
    setActiveFilter(filter);
  }, []);

  // ============ RETURN ============

  return {
    status,
    activities,
    filteredActivities,
    activeFilter,
    setFilter,
    totalCount: counts.total,
    depositCount: counts.deposit,
    withdrawalCount: counts.withdrawal,
    refundCount: counts.refund,
    isLoading: discovery.isDiscovering && !discovery.data,
    isRefreshing: discovery.isDiscovering && !!discovery.data,
  };
}
