/**
 * CopyableText Component
 * Text that can be clicked to copy to clipboard
 */

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface CopyableTextProps {
  /** The full text to copy */
  text: string;
  /** Optional displayed text (defaults to truncated version) */
  displayText?: string;
  /** Truncate to show first N characters */
  truncateStart?: number;
  /** Truncate to show last N characters */
  truncateEnd?: number;
  /** Additional class names */
  className?: string;
  /** Show copy icon */
  showIcon?: boolean;
}

export function CopyableText({
  text,
  displayText,
  truncateStart = 6,
  truncateEnd = 4,
  className,
  showIcon = true,
}: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [text]);

  // Generate display text: use provided, or truncate
  const shownText =
    displayText ??
    (text.length > truncateStart + truncateEnd + 3
      ? `${text.slice(0, truncateStart)}...${text.slice(-truncateEnd)}`
      : text);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "group inline-flex items-center gap-1.5 font-mono text-sm",
        "text-neutral-300 hover:text-white transition-colors",
        "cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 -mx-1",
        className
      )}
      title={`Click to copy: ${text}`}
    >
      <span>{shownText}</span>
      {showIcon && (
        <span className="text-neutral-500 group-hover:text-neutral-300 transition-colors">
          {copied ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </span>
      )}
    </button>
  );
}
