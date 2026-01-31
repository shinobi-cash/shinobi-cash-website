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
    <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
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
        <div className="flex h-7 w-7 items-center justify-center text-neutral-400 sm:h-8 sm:w-8">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold text-white sm:text-lg">{title}</h2>
        {subtitle && <p className="truncate text-xs text-neutral-400">{subtitle}</p>}
      </div>
      {rightContent && <div className="shrink-0">{rightContent}</div>}
    </div>
  );
}
