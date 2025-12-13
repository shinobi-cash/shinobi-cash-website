import { useEffect, useRef } from "react";
import { useActivities } from "../../hooks/data/useActivities";
import { showToast } from "../../lib/toast";
import { PoolDashboard } from "../features/pool/PoolDashboard";
import { AppHeader } from "../layout/AppHeader";
import { AppLayout } from "../layout/ScreenLayout";
import { type ScreenConfig, ScreenManager } from "../layout/ScreenManager";
import { DepositScreen } from "./DepositScreen";
import { MyNotesScreen } from "./MyNotesScreen";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";

function HomeScreenController() {
  const lastErrorRef = useRef<string | null>(null);

  const { data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useActivities(
    SHINOBI_CASH_ETH_POOL.address,
    10,
  );

  // Flatten all pages into one array
  const activities = data?.pages.flatMap((page) => page.items) ?? [];

  // Show toast error if we already have some data and a new error occurs
  useEffect(() => {
    const errorMessage = error?.message || null;

    if (errorMessage && activities.length > 0 && errorMessage !== lastErrorRef.current) {
      showToast.error("Failed to refresh activities");
      lastErrorRef.current = errorMessage;
    } else if (!errorMessage) {
      lastErrorRef.current = null;
    }
  }, [error?.message, activities.length]);

  return (
    <PoolDashboard
      activities={activities}
      loading={isLoading}
      error={error && activities.length === 0 ? "Failed to load activities" : undefined}
      hasNextPage={hasNextPage}
      onFetchMore={fetchNextPage}
      onRefresh={refetch}
      isFetchingMore={isFetchingNextPage}
    />
  );
}

// Screen Registry
const screenRegistry: ScreenConfig[] = [
  {
    id: "home",
    component: HomeScreenController,
    title: "Pool",
    scrollable: true,
  },
  {
    id: "deposit",
    component: DepositScreen,
    title: "Deposit",
    scrollable: true,
  },
  {
    id: "my-notes",
    component: MyNotesScreen,
    title: "My Notes",
    scrollable: true,
  },
];

function FallbackScreen() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-app-primary mb-2">Screen Not Found</h2>
        <p className="text-app-secondary">The requested screen could not be found.</p>
      </div>
    </div>
  );
}

function MainContent() {
  return (
    <AppLayout header={<AppHeader />}>
      <ScreenManager screens={screenRegistry} fallbackScreen={FallbackScreen} />
    </AppLayout>
  );
}

export const MainScreen = () => <MainContent />;
