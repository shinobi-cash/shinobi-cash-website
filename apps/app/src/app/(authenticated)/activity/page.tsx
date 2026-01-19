"use client";

import { useState, useMemo } from "react";
import { ActivityFilterDropdown } from "@/components/activity/ActivityFilterDropdown";
import { ActivityList } from "@/components/activity/ActivityList";
import { ActivityDetailsScreen } from "@/components/screens/ActivityDetailsScreen";
import { useActivityScreen } from "@/hooks/useActivityScreen";

export default function ActivityPage() {
  const activityController = useActivityScreen();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  // Find the selected activity
  const selectedActivity = useMemo(() => {
    if (!selectedActivityId) return null;
    return activityController.activities.find((a) => a.id === selectedActivityId) ?? null;
  }, [selectedActivityId, activityController.activities]);

  const handleActivityClick = (activityId: string) => {
    setSelectedActivityId(activityId);
  };

  const handleBack = () => {
    setSelectedActivityId(null);
  };

  // Show activity details if selected
  if (selectedActivity) {
    return <ActivityDetailsScreen activity={selectedActivity} onBack={handleBack} />;
  }

  return (
    <div className="flex h-[550px] w-full flex-col">
      {/* Header with Filter - Fixed */}
      <div className="shrink-0 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <ActivityFilterDropdown
            activeFilter={activityController.activeFilter}
            onFilterChange={activityController.setFilter}
            counts={{
              total: activityController.totalCount,
              deposit: activityController.depositCount,
              withdrawal: activityController.withdrawalCount,
              refund: activityController.refundCount,
            }}
          />
        </div>
      </div>

      {/* Activity List - Scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2 sm:px-6">
        <ActivityList
          activities={activityController.filteredActivities}
          status={activityController.status}
          activeFilter={activityController.activeFilter}
          totalCount={activityController.totalCount}
          onActivityClick={handleActivityClick}
        />
      </div>
    </div>
  );
}
