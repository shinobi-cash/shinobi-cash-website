"use client";

import { useIsAuthenticated } from "@/features/auth/hooks/useAuthStore";
import { AuthScreen } from "@/features/auth/ui/screens/AuthScreen";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardTabs } from "@/components/layout/DashboardTabs";
import { SyncIndicator } from "@/components/navigation/SyncIndicator";
import { useNotesController } from "@/features/notes";

/**
 * Authenticated Layout
 * Wraps all authenticated routes (notes, deposit, withdraw, activity)
 * Provides auth check, header, card UI with tabs, and footer
 */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const notesController = useNotesController();

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="bg-linear-to-br flex min-h-dvh flex-col overflow-y-auto from-gray-900 via-gray-900 to-black">
        <div className="p-4">
          <Header />
        </div>

        <div className="flex-1 py-8">
          <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl">
            <AuthScreen />
          </div>
        </div>

        <div className="hidden shrink-0 md:block">
          <Footer />
        </div>
      </div>
    );
  }

  // Authenticated layout with card UI
  return (
    <div className="bg-linear-to-br flex min-h-dvh flex-col overflow-y-auto from-gray-900 via-gray-900 to-black">
      <div className="p-4">
        <Header />
      </div>

      <div className="flex-1 py-8">
        <div className="mx-auto w-full max-w-md rounded-xl border bg-gray-900/70 md:max-w-lg lg:max-w-xl">
          {/* Card Top Bar */}
          <div className="flex items-center justify-between gap-4 px-4 pt-4">
            <DashboardTabs />
            <SyncIndicator onSync={notesController.refresh} />
          </div>

          {/* Card Content */}
          <div>{children}</div>
        </div>
      </div>

      <div className="hidden shrink-0 md:block">
        <Footer />
      </div>
    </div>
  );
}
