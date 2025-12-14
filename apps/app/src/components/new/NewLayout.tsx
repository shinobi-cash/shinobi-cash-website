"use client";

import { Header } from "./Header";
import { MainCard } from "./MainCard";
import { AnnouncementBar } from "./AnnouncementBar";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";

export function NewLayout() {
  return (
    <div className="h-screen overflow-hidden bg-linear-to-br from-gray-900 via-gray-900 to-black flex flex-col">
      {/* Header */}
      <div className="shrink-0 p-4 sm:p-6">
        <Header />
      </div>

      {/* Main content - takes remaining space */}
      <main className="flex-1 flex items-center justify-center px-4 pb-20 md:pb-0 min-h-0">
        <MainCard />
      </main>

      {/* Desktop: Scenic bottom section with announcement & footer */}
      <div className="hidden md:block shrink-0 relative">
        {/* Background illustration placeholder */}
        <div className="h-32 sm:h-40 bg-linear-to-t from-gray-950 to-transparent" />

        {/* Announcement bar */}
        <AnnouncementBar />

        {/* Footer */}
        <Footer />
      </div>

      {/* Mobile: Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
