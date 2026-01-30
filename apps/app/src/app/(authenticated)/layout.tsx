"use client";

import { AuthScreen } from "@/components/screens/AuthScreen";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { NavLinks } from "@/components/layout/NavLinks";
import { useSnapshot } from "valtio";
import { AuthController } from "@/controllers/AuthController";
import { IndexerHealthIndicator } from "@/components/indicators/IndexerHealthIndicator";
import { NotesSyncIndicator } from "@/components/indicators/NotesSyncIndicator";
import { NotesSyncingScreen } from "@/components/indicators/NotesSyncingBanner";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const state = useSnapshot(AuthController.state);
  const notesState = useSnapshot(NotesDiscoveryController.state);

  const isAuthenticated = state.state.status === "authenticated";
  const isNotesSyncing =
    notesState.state.status === "discovering" && notesState.noteChains.length === 0;

  const content = isAuthenticated ? (
    <>
      <div className="mb-4">
        <NavLinks />
      </div>
      <div className="rounded-2xl">{isNotesSyncing ? <NotesSyncingScreen /> : children}</div>
    </>
  ) : (
    <AuthScreen />
  );

  return (
    <div className="flex min-h-dvh flex-col overflow-y-auto">
      <Header />

      <div className={`flex-1 py-8 ${!isAuthenticated ? "flex items-center justify-center" : ""}`}>
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl">{content}</div>
      </div>

      <div className="hidden shrink-0 md:block">
        <Footer
          indicators={
            isAuthenticated ? (
              <>
                <NotesSyncIndicator />
                <IndexerHealthIndicator />
              </>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
