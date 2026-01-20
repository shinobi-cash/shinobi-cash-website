"use client";

import { ActivityFilterDropdown } from "@/components/activity/ActivityFilterDropdown";
import { ActivityList } from "@/components/activity/ActivityList";
import { ActivityDetailsScreen } from "@/components/screens/ActivityDetailsScreen";
import { useActivityScreen } from "@/hooks/useActivityScreen";

export default function ActivityPage() {
  const controller = useActivityScreen();

  // Show activity details if selected
  if (controller.selectedActivity) {
    return (
      <ActivityDetailsScreen
        activity={controller.selectedActivity}
        onBack={controller.clearSelection}
      />
    );
  }

  return (
    <div className="flex h-[600px] w-full flex-col">
      {/* Header with Filter - Fixed */}
      <div className="shrink-0 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <ActivityFilterDropdown
            activeFilter={controller.activeFilter}
            onFilterChange={controller.setFilter}
            counts={{
              total: controller.totalCount,
              deposit: controller.depositCount,
              withdrawal: controller.withdrawalCount,
              refund: controller.refundCount,
            }}
          />
        </div>
      </div>

      {/* Activity List - Scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2 sm:px-6">
        <ActivityList
          activities={controller.filteredActivities}
          status={controller.status}
          activeFilter={controller.activeFilter}
          totalCount={controller.totalCount}
          onActivityClick={controller.selectActivity}
        />
      </div>
    </div>
  );
}
