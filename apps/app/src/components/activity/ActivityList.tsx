/**
 * Activity List Component
 *
 * Scrollable list of activity entries with empty states.
 */

import { RefreshCw } from "lucide-react";
import { ActivityRow } from "./ActivityRow";
import type { ActivityEntry, ActivityFilter, ActivityStatus } from "@/types/activity";
import { getActivityId } from "@/types/activity";

interface ActivityListProps {
  entries: readonly ActivityEntry[];
  status: ActivityStatus;
  activeFilter: ActivityFilter;
  totalCount: number;
  onActivityClick?: (activityId: string) => void;
}

export function ActivityList({
  entries,
  status,
  activeFilter,
  totalCount,
  onActivityClick,
}: ActivityListProps) {
  const renderEmptyState = () => {
    if (status.type === "error") {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-app-secondary mb-1">Unable to load activities</p>
            <p className="text-app-tertiary text-sm">{status.message}</p>
          </div>
        </div>
      );
    }

    if (status.type === "loading") {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="text-app-secondary mx-auto mb-2 h-6 w-6 animate-spin" />
            <p className="text-app-secondary">Loading activities...</p>
          </div>
        </div>
      );
    }

    if (status.type === "empty") {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <span className="mb-2 block text-2xl">📋</span>
            <p className="text-app-secondary mb-1">No activity yet</p>
            <p className="text-app-tertiary text-sm">
              Make your first deposit to see activity history
            </p>
          </div>
        </div>
      );
    }

    // Has activities but none match current filter
    if (entries.length === 0 && totalCount > 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            {activeFilter === "deposit" ? (
              <>
                <span className="mb-2 block text-2xl">💰</span>
                <p className="text-app-secondary mb-1">No deposits</p>
                <p className="text-app-tertiary text-sm">You haven&apos;t made any deposits yet</p>
              </>
            ) : activeFilter === "withdrawal" ? (
              <>
                <span className="mb-2 block text-2xl">💸</span>
                <p className="text-app-secondary mb-1">No withdrawals</p>
                <p className="text-app-tertiary text-sm">
                  You haven&apos;t made any withdrawals yet
                </p>
              </>
            ) : activeFilter === "refund" ? (
              <>
                <span className="mb-2 block text-2xl">↩️</span>
                <p className="text-app-secondary mb-1">No refunds</p>
                <p className="text-app-tertiary text-sm">You have no failed transactions</p>
              </>
            ) : null}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-full space-y-2 overflow-y-auto">
      {renderEmptyState()}

      {entries.length > 0 && (
        <>
          {entries.map((entry) => (
            <div key={getActivityId(entry)}>
              <ActivityRow
                entry={entry}
                onClick={() => onActivityClick?.(getActivityId(entry))}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
