"use client";

import { WordRotate } from "@workspace/ui/components/word-rotate";

export default function HeroTitle() {
  return (
    <h1 className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-4xl font-bold sm:flex-nowrap sm:gap-x-2 sm:text-5xl md:text-6xl lg:text-7xl">
      <WordRotate
        words={["Simple", "Borderless", "Compliant"]}
        duration={3000}
        className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 bg-clip-text text-transparent"
      />
      <span className="text-foreground whitespace-nowrap">Privacy</span>
    </h1>
  );
}
