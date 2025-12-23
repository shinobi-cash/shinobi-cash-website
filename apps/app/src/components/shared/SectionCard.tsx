/**
 * Section Card Component
 * Container with consistent styling for sections
 * Follows Single Responsibility Principle
 */

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SectionCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function SectionCard({
  title,
  children,
  className,
  headerClassName,
  contentClassName,
}: SectionCardProps) {
  return (
    <div className={cn("bg-app-surface border-app rounded-xl border shadow-sm", className)}>
      {title && (
        <div className={cn("border-app border-b px-2 py-2", headerClassName)}>
          <h3 className="text-app-primary text-sm font-semibold">{title}</h3>
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
