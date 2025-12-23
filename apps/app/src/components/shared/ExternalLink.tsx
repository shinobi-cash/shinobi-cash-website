/**
 * External Link Component
 * Consistent external link with icon
 * Follows Single Responsibility Principle
 */

import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ExternalLinkProps {
  href: string;
  children?: ReactNode;
  className?: string;
  iconClassName?: string;
  showIcon?: boolean;
}

export function ExternalLink({
  href,
  children,
  className,
  iconClassName,
  showIcon = true,
}: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-blue-500 transition-colors duration-200 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300",
        className
      )}
    >
      {children}
      {showIcon && <ExternalLinkIcon className={cn("h-3 w-3", iconClassName)} />}
    </a>
  );
}
