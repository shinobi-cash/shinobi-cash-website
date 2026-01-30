/**
 * CardContainer Component
 * Rounded border card wrapper for input/output sections
 */

import type { ReactNode } from "react";
import { cn } from "@workspace/ui/lib/utils";

interface CardContainerProps {
  children: ReactNode;
  className?: string;
}

export function CardContainer({ children, className }: CardContainerProps) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:space-y-3 sm:p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
