"use client";

import { SyncIndicator } from "@/components/navigation/SyncIndicator";
import { IndexerHealthIndicator } from "@/components/navigation/IndexerHealthIndicator";
import { useNoteDiscoverySession } from "@/hooks/notes/useNoteDiscoverySession";

interface FooterProps {
  showIndicators?: boolean;
}

export function Footer({ showIndicators = false }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const noteDiscoverySession = useNoteDiscoverySession();

  return (
    <footer className="border-t border-gray-800 bg-black/30 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-sm text-gray-400">© Shinobi Cash - {currentYear}</div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a href="#" className="text-gray-400 transition-colors hover:text-white">
              Documentation
            </a>
            <a href="#" className="text-gray-400 transition-colors hover:text-white">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-400 transition-colors hover:text-white">
              Terms of Service
            </a>
            <a href="#" className="text-gray-400 transition-colors hover:text-white">
              GitHub
            </a>
          </div>
          <div className="flex items-center gap-4">
            {showIndicators && (
              <>
                <IndexerHealthIndicator />
                <div className="h-4 w-px bg-gray-700" />
                <SyncIndicator
                  onSync={() => {
                    noteDiscoverySession.discovery.refresh();
                  }}
                />
              </>
            )}
            <div className="text-sm text-gray-500">v1.0.0</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
