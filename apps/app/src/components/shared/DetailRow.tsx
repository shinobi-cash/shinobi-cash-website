/**
 * Detail Row Component
 * Displays a label-value pair in a consistent format
 * Follows Single Responsibility Principle
 */

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DetailRowProps {
  label: string;
  value: ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export function DetailRow({
  label,
  value,
  className,
  labelClassName,
  valueClassName
}: DetailRowProps) {
  return (
    <div className={cn("flex items-center justify-between px-2 py-2", className)}>
      <span className={cn("text-xs font-medium text-app-secondary", labelClassName)}>
        {label}
      </span>
      <span className={cn("text-xs font-semibold text-app-primary text-right", valueClassName)}>
        {value}
      </span>
    </div>
  );
}
