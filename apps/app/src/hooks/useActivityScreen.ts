/**
 * Activity Screen Controller Hook
 */

"use client";

import { useMemo } from "react";
import { useSnapshot } from "valtio";
import type { ActivityEntry, ActivityFilter, ActivityStatus } from "@/types/activity";
import { useActivityDiscovery } from "./useActivityDiscovery";
import { ActivityDiscoveryController } from "@/controllers/ActivityDiscoveryController";
import { ActivityScreenController } from "@/controllers/ActivityScreenController";
import { filterActivitiesByType, findActivityById } from "@/utils/activityDerivation";

export interface ActivityScreenAPI {
  status: ActivityStatus;
  syncError: string | null;
  entries: readonly ActivityEntry[];
  filteredEntries: readonly ActivityEntry[];
  activeFilter: ActivityFilter;
  setFilter: (filter: ActivityFilter) => void;
  selectedEntry: ActivityEntry | null;
  selectActivity: (activityId: string) => void;
  clearSelection: () => void;
  totalCount: number;
  depositCount: number;
  withdrawalCount: number;
  refundCount: number;
  isLoading: boolean;
}

export function useActivityScreen(): ActivityScreenAPI {
  // Trigger activity derivation from notes
  useActivityDiscovery();

  const { entries, counts, status, syncError } = useSnapshot(ActivityDiscoveryController.state);
  const { activeFilter, selectedActivityId } = useSnapshot(ActivityScreenController.state);

  const filteredEntries = useMemo(
    () => filterActivitiesByType(entries as ActivityEntry[], activeFilter),
    [entries, activeFilter]
  );

  const selectedEntry = useMemo(() => {
    if (!selectedActivityId) return null;
    return findActivityById(entries as ActivityEntry[], selectedActivityId) ?? null;
  }, [selectedActivityId, entries]);

  return {
    status,
    syncError,
    // Cast to remove Valtio's readonly wrapper for compatibility with ActivityEntry type
    entries: entries as readonly ActivityEntry[],
    filteredEntries,
    activeFilter,
    setFilter: ActivityScreenController.setFilter,
    selectedEntry,
    selectActivity: ActivityScreenController.selectActivity,
    clearSelection: ActivityScreenController.clearSelection,
    totalCount: counts.total,
    depositCount: counts.deposit,
    withdrawalCount: counts.withdrawal,
    refundCount: counts.refund,
    isLoading: status.type === "loading",
  };
}
