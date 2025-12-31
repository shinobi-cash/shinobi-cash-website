"use client";

import { useIsAuthenticated } from "@/features/auth/hooks/useAuthStore";
import { AuthScreen } from "@/features/auth/ui/AuthScreen";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DashboardTabs } from "@/components/DashboardTabs";
import { SyncIndicator } from "@/components/SyncIndicator";
import { useNotesController } from "@/features/notes";

// ============ ROOT LAYOUT ============

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useIsAuthenticated();

  return isAuthenticated ? (
    <AuthenticatedDashboard>{children}</AuthenticatedDashboard>
  ) : (
    <UnauthenticatedDashboard />
  );
}

// ============ UNAUTHENTICATED ============

function UnauthenticatedDashboard() {
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

// ============ AUTHENTICATED ============

function AuthenticatedDashboard({ children }: { children: React.ReactNode }) {
  // 🔒 Guaranteed auth context
  const notesController = useNotesController();

  return (
    <div className="bg-linear-to-br flex min-h-dvh flex-col overflow-y-auto from-gray-900 via-gray-900 to-black md:justify-between">
      <div className="p-4">
        <Header />
      </div>

      <div className="mx-auto mb-8 w-full max-w-md rounded-xl border bg-gray-900/80 backdrop-blur-md md:max-w-lg lg:max-w-xl">
        {/* Card Top Bar */}
        <div className="flex items-center justify-between gap-4 px-4 pt-4">
          <DashboardTabs />
          <SyncIndicator onSync={notesController.refresh} />
        </div>

        {/* Card Content */}
        <div className="h-[600px]">{children}</div>
      </div>

      <div className="hidden shrink-0 md:block">
        <Footer />
      </div>
    </div>
  );
}
