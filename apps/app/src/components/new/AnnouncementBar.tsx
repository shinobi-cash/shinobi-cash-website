"use client";

import { X } from "lucide-react";
import { useState } from "react";

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative z-40 border-t border-gray-800 bg-gray-900/90 text-white backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-2">
          <p className="text-center text-sm font-medium sm:text-base">
            Private cross-chain transactions powered by zero-knowledge proofs
          </p>
          <button
            onClick={() => setIsVisible(false)}
            className="rounded p-1 transition-colors hover:bg-gray-800"
            aria-label="Close announcement"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
