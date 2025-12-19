"use client";

import { AnnouncementBar } from "@/components/new/AnnouncementBar";
// import { BottomNav } from "@/components/new/BottomNav";
import { Footer } from "@/components/new/Footer";
import { Header } from "@/components/new/Header";
import { MainCard } from "@/components/new/MainCard";


export default function Home() {
  return (
    <div className="h-screen md:justify-between overflow-y-scroll bg-linear-to-br from-gray-900 via-gray-900 to-black flex flex-col">
      <div className="p-4">
        <Header />
      </div>
     
     <div className="flex items-center w-full md:w-xl md:max-h-1/2 px-4 mx-auto bg-gray-900/80 backdrop-blur-md mb-8 ">
          <MainCard />
      </div>
      

      <div className="hidden md:block shrink-0">
        <AnnouncementBar />
        <Footer />
      </div>

      {/* <BottomNav /> */}
    </div>

  );
}
