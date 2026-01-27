"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, History } from "lucide-react";
import { ActivityFilterDropdown } from "@/components/activity/ActivityFilterDropdown";
import { ActivityList } from "@/components/activity/ActivityList";
import { ActivityDetailsScreen } from "@/components/screens/ActivityDetailsScreen";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { useActivityScreen } from "@/hooks/useActivityScreen";

export default function ActivityPage() {
  const router = useRouter();
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
    <ScreenLayout
      containerClassName="h-[600px]"
      header={
        <ScreenHeader
          title="Activity"
          icon={<History className="h-5 w-5" />}
          onBack={() => router.push("/notes")}
          rightContent={
            <div className="flex items-center gap-2">
              {controller.syncError && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="cursor-pointer rounded p-1 hover:bg-white/10">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Unable to sync. Showing cached data.</p>
                  </TooltipContent>
                </Tooltip>
              )}
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
          }
        />
      }
      contentClassName="px-4 pb-4 pt-2 sm:px-6"
    >
      <ActivityList
        activities={controller.filteredActivities}
        status={controller.status}
        activeFilter={controller.activeFilter}
        totalCount={controller.totalCount}
        onActivityClick={controller.selectActivity}
      />
    </ScreenLayout>
  );
}
