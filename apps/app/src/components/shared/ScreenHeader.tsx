/**
 * Screen Header Component
 * Reusable header with optional back button or icon for full-screen views
 */

import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backDisabled?: boolean;
  icon?: ReactNode;
  rightContent?: ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backDisabled,
  icon,
  rightContent,
}: ScreenHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {onBack ? (
        <Button
          size="icon-sm"
          onClick={onBack}
          disabled={backDisabled}
          className="bg-transparent hover:bg-white/10"
          aria-label="Go back"
        >
          <ChevronLeft className="h-4 w-4 text-neutral-400" />
        </Button>
      ) : icon ? (
        <div className="flex h-8 w-8 items-center justify-center text-neutral-400">{icon}</div>
      ) : null}
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-neutral-400">{subtitle}</p>}
      </div>
      {rightContent && <div>{rightContent}</div>}
    </div>
  );
}
