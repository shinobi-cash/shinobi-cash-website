"use client";

import { AnnouncementBar } from "@/components/new/AnnouncementBar";
// import { BottomNav } from "@/components/new/BottomNav";
import { Footer } from "@/components/new/Footer";
import { Header } from "@/components/new/Header";
import { MainCard } from "@/components/new/MainCard";

export default function Home() {
  return (
    <div className="bg-linear-to-br flex h-screen flex-col overflow-y-scroll from-gray-900 via-gray-900 to-black md:justify-between">
      <div className="p-4">
        <Header />
      </div>

      <div className="md:w-xl md:max-h-1/2 mx-auto mb-8 flex w-full items-center bg-gray-900/80 px-4 backdrop-blur-md">
        <MainCard />
      </div>

      <div className="hidden shrink-0 md:block">
        <AnnouncementBar />
        <Footer />
      </div>

      {/* <BottomNav /> */}
    </div>
  );
}
