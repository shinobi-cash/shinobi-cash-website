"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useNotesController } from "@/features/notes";
import { SyncIndicator } from "@/components/SyncIndicator";
import { DashboardTabs } from "@/components/DashboardTabs";
import { AuthScreen } from "@/components/AuthScreen";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, publicKey, accountKey } = useAuth();
  const notesController = useNotesController();

  // Auth guard - show auth screen if not authenticated
  if (!isAuthenticated || !publicKey || !accountKey) {
    return (
      <div className="bg-linear-to-br flex min-h-dvh flex-col overflow-y-auto from-gray-900 via-gray-900 to-black md:justify-between">
        <div className="p-4">
          <Header />
        </div>
        <div className="mx-auto mb-8 w-full max-w-md md:max-w-lg lg:max-w-xl">
          <AuthScreen />
        </div>
        <div className="hidden shrink-0 md:block">
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-linear-to-br flex min-h-dvh flex-col overflow-y-auto from-gray-900 via-gray-900 to-black md:justify-between">
      <div className="p-4">
        <Header />
      </div>

      <div className="mx-auto mb-8 w-full max-w-md rounded-xl border bg-gray-900/80 backdrop-blur-md md:max-w-lg lg:max-w-xl">
        {/* Card Top Bar - Tabs + Sync */}
        <div className="flex items-center justify-between gap-4 px-4 pt-4">
          <DashboardTabs />
          <SyncIndicator onSync={notesController.refresh} />
        </div>

        {/* Card Content - Route-specific content */}
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>

      <div className="hidden shrink-0 md:block">
        <Footer />
      </div>
    </div>
  );
}
