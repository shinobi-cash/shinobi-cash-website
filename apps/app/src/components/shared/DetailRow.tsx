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
  valueClassName,
}: DetailRowProps) {
  return (
    <div className={cn("flex items-center justify-between px-2 py-2", className)}>
      <span className={cn("text-app-secondary text-xs font-medium", labelClassName)}>{label}</span>
      <span className={cn("text-app-primary text-right text-xs font-semibold", valueClassName)}>
        {value}
      </span>
    </div>
  );
}
