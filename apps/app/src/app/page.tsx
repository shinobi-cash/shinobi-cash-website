"use client";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MainCard } from "@/components/MainCard";

export default function Home() {
  return (
    <div className="bg-linear-to-br flex min-h-dvh flex-col overflow-y-auto from-gray-900 via-gray-900 to-black md:justify-between">
      <div className="p-4">
        <Header />
      </div>

      <div className="mx-auto mb-8 flex w-full border rounded-xl max-w-md items-center bg-gray-900/80 px-4 backdrop-blur-md md:max-w-lg lg:max-w-xl">
        <MainCard />
      </div>

      <div className="hidden shrink-0 md:block">
        <Footer />
      </div>
    </div>
  );
}
