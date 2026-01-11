/**
 * Screen Header Component
 * Reusable header with back button for full-screen views
 */

import { ChevronLeft } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
}

export function ScreenHeader({ title, subtitle, onBack }: ScreenHeaderProps) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="hover:bg-app-surface-hover h-8 w-8 p-0 transition-colors duration-200"
        aria-label="Go back"
      >
        <ChevronLeft className="text-app-secondary h-4 w-4" />
      </Button>
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}
