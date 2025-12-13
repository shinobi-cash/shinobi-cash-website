"use client";

import { WordRotate } from "@workspace/ui/components/word-rotate";

export default function HeroTitle() {
  return (
    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold flex flex-wrap sm:flex-nowrap items-center justify-center gap-x-1 sm:gap-x-2 gap-y-2">
      <WordRotate
        words={["One Click", "Borderless", "Compliant"]}
        duration={3000}
        className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 bg-clip-text text-transparent"
      />
      <span className="text-foreground whitespace-nowrap">Privacy</span>
    </h1>
  );
}
