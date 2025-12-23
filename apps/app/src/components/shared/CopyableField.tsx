/**
 * Copyable Field Component
 * Displays text with a copy-to-clipboard button
 * Follows Single Responsibility Principle
 */

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface CopyableFieldProps {
  value: string;
  label?: string;
  displayValue?: string;
  className?: string;
  showLabel?: boolean;
}

export function CopyableField({
  value,
  label,
  displayValue,
  className,
  showLabel = true,
}: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn("Copy failed:", error);
    }
  };

  return (
    <div className={cn("flex items-center justify-between", className)}>
      {showLabel && label && (
        <span className="text-app-secondary text-xs font-medium">{label}</span>
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-app-primary font-mono text-xs">{displayValue || value}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="hover:bg-app-surface-hover rounded-md transition-colors duration-200"
          title={copied ? "Copied!" : `Copy ${label || "value"}`}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="text-app-tertiary h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
