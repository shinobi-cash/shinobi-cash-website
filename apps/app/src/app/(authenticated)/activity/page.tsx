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

  const handleViewNoteChain = (depositIndex: number) => {
    // Navigate to notes page with the deposit index as query param
    router.push(`/notes?depositIndex=${depositIndex}`);
  };

  // Show activity details if selected
  if (controller.selectedEntry) {
    return (
      <ActivityDetailsScreen
        entry={controller.selectedEntry}
        onBack={controller.clearSelection}
        onViewNoteChain={handleViewNoteChain}
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
      contentClassName="pb-4 pt-2"
    >
      <ActivityList
        entries={controller.filteredEntries}
        status={controller.status}
        activeFilter={controller.activeFilter}
        totalCount={controller.totalCount}
        onActivityClick={controller.selectActivity}
      />
    </ScreenLayout>
  );
}
