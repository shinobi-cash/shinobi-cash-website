"use client";

import { useState } from "react";

interface CopyableTextProps {
  value: string;
  displayValue?: string;
  className?: string;
}

export function CopyableText({ value, displayValue, className = "" }: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silently fail
    }
  };

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleCopy}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleCopy(e);
        }
      }}
      className={`relative cursor-pointer transition-opacity hover:opacity-70 ${className}`}
      title={`Click to copy: ${value}`}
    >
      {displayValue ?? value}
      {copied && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-800 px-2 py-1 text-xs text-white">
          Copied!
        </span>
      )}
    </span>
  );
}
