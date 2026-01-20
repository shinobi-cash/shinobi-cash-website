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
  backDisabled?: boolean;
}

export function ScreenHeader({ title, subtitle, onBack, backDisabled }: ScreenHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Button
        size="icon-sm"
        onClick={onBack}
        disabled={backDisabled}
        className="bg-transparent hover:bg-white/10"
        aria-label="Go back"
      >
        <ChevronLeft className="h-4 w-4 text-neutral-400" />
      </Button>
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-neutral-400 text-xs">{subtitle}</p>}
      </div>
    </div>
  );
}
