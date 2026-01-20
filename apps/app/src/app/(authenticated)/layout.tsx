"use client";

import { AuthScreen } from "@/components/screens/AuthScreen";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardTabs } from "@/components/layout/DashboardTabs";
import { useSnapshot } from "valtio";
import { AuthController } from "@/controllers/AuthController";
import { IndexerHealthIndicator } from "@/components/indicators/IndexerHealthIndicator";
import { NotesSyncingScreen } from "@/components/indicators/NotesSyncingBanner";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";

/**
 * Authenticated Layout
 * Wraps all authenticated routes (notes, deposit, withdraw, activity)
 * Provides auth check, header, card UI with tabs, and footer
 */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const state = useSnapshot(AuthController.state);
  const notesState = useSnapshot(NotesDiscoveryController.state);

  const isAuthenticated = state.state.status === "authenticated";
  const isNotesSyncing = notesState.state.status === "discovering" && notesState.noteChains.length === 0;

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-dvh flex-col overflow-y-auto">
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
    <div className="flex min-h-dvh flex-col overflow-y-auto">
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
          <div className="rounded-xl border border-border bg-card/70">
            {isNotesSyncing ? <NotesSyncingScreen /> : children}
          </div>
        </div>
      </div>

      <div className="hidden shrink-0 md:block">
        <Footer indicators={<IndexerHealthIndicator />} />
      </div>
    </div>
  );
}
