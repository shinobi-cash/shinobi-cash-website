"use client";

import { useState, useEffect } from "react";
import HeroTitle from "@/components/hero-title";
import { Particles } from "@workspace/ui/components/particles";
import Image from "next/image";

export default function Page() {
  const [particleCount, setParticleCount] = useState(250);

  useEffect(() => {
    const updateParticleCount = () => {
      const width = window.innerWidth;
      if (width < 640) {
        // Mobile: fewer particles for better performance
        setParticleCount(50);
      } else if (width < 1024) {
        // Tablet: moderate amount
        setParticleCount(100);
      } else {
        // Desktop: full amount
        setParticleCount(250);
      }
    };

    // Set initial count
    updateParticleCount();

    // Update on resize
    window.addEventListener("resize", updateParticleCount);
    return () => window.removeEventListener("resize", updateParticleCount);
  }, []);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative flex items-center justify-center min-h-svh px-4 overflow-hidden">
        {/* Particle Background */}
        <Particles
          className="absolute inset-0"
          quantity={particleCount}
          ease={80}
          color="#f97316"
          refresh
        />

        {/* Shinobi Logo Background */}
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
          <HeroTitle />
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl px-4">
            Shinobi Cash brings first crosschain privacy pool protocol onchain
          </p>
        </div>

        {/* Bottom Section - Aligned with Navbar */}
        <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-0 right-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end justify-between">
            {/* Bottom Left - Deposit */}
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground mb-1">Deposit</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold">
                <span className="md:hidden">$12.5M</span>
                <span className="hidden md:inline">$12,500,000</span>
              </div>
            </div>

            {/* Bottom Right - Scroll to Explore */}
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <div className="text-xs sm:text-sm text-muted-foreground">Scroll to explore</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
