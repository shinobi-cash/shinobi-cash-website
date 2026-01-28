"use client";

import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { ActivityFilterDropdown } from "@/components/activity/ActivityFilterDropdown";
import { ActivityList } from "@/components/activity/ActivityList";
import { ActivityDetailsScreen } from "@/components/screens/ActivityDetailsScreen";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
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
                <Badge variant="secondary" className="text-yellow-400">
                  Cached
                </Badge>
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
