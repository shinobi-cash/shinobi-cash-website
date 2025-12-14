"use client";

import { X } from "lucide-react";
import { useState } from "react";

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative z-40 bg-gray-900/90 backdrop-blur-sm border-t border-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-2">
          <p className="text-sm sm:text-base font-medium text-center">
            Private cross-chain transactions powered by zero-knowledge proofs
          </p>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
            aria-label="Close announcement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
