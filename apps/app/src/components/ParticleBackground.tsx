"use client";

import { useState, useEffect } from "react";
import { Particles } from "@workspace/ui/components/particles";

export const ParticleBackground = () => {
  const [particleCount, setParticleCount] = useState(50);

  useEffect(() => {
    const updateParticleCount = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setParticleCount(50);
      } else if (width < 1024) {
        setParticleCount(100);
      } else {
        setParticleCount(150);
      }
    };

    updateParticleCount();
    window.addEventListener("resize", updateParticleCount);
    return () => window.removeEventListener("resize", updateParticleCount);
  }, []);

  return (
    <Particles
      className="fixed inset-0 pointer-events-none"
      quantity={particleCount}
      ease={80}
      color="#f97316"
      refresh
    />
  );
};
