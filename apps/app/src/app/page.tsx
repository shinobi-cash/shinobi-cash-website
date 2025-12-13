"use client";

import { useState, useEffect } from "react";
import { Particles } from "@workspace/ui/components/particles";
import { ConnectButton } from "@/components/ConnectButton";
import Image from "next/image";

export default function Home() {
  const [particleCount, setParticleCount] = useState(250);

  useEffect(() => {
    const updateParticleCount = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setParticleCount(50);
      } else if (width < 1024) {
        setParticleCount(100);
      } else {
        setParticleCount(250);
      }
    };

    updateParticleCount();
    window.addEventListener("resize", updateParticleCount);
    return () => window.removeEventListener("resize", updateParticleCount);
  }, []);

  return (
    <main className="min-h-screen">
      <section className="relative flex items-center justify-center min-h-svh px-4 overflow-hidden">
        <Particles
          className="absolute inset-0"
          quantity={particleCount}
          ease={80}
          color="#f97316"
          refresh
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <Image
            src="/Shinobi.Cash-icon.svg"
            alt="Shinobi Logo"
            width={600}
            height={600}
            className="w-[300px] md:w-[500px] lg:w-[600px]"
            style={{ transform: 'perspective(1000px) rotateX(35deg)' }}
          />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center gap-6 sm:gap-8 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            Shinobi Cash
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl px-4">
            One click, borderless and complaint privacy
          </p>
          <ConnectButton />
        </div>
      </section>
    </main>
  );
}