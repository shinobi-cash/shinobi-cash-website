"use client";

import { AuthScreen } from "@/features/auth/ui/screens/AuthScreen";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardTabs } from "@/components/layout/DashboardTabs";
import { useSnapshot } from "valtio";
import { AuthController } from "@/controllers/AuthController";

/**
 * Authenticated Layout
 * Wraps all authenticated routes (notes, deposit, withdraw, activity)
 * Provides auth check, header, card UI with tabs, and footer
 */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const state = useSnapshot(AuthController.state);
  const isAuthenticated = state.state.status === "authenticated";

  console.log({ isAuthenticated });
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
        <div className="mx-auto w-full max-w-md space-y-4 md:max-w-lg lg:max-w-xl">
          {/* Card Top Bar */}
          <div className="flex items-center justify-between gap-4 px-4 pt-4">
            <DashboardTabs />
          </div>

          {/* Card Content */}
          <div className="rounded-xl border bg-gray-900/70">{children}</div>
        </div>
      </div>

      <div className="hidden shrink-0 md:block">
        <Footer showIndicators={true} />
      </div>
    </div>
  );
}
