"use client";

import { useState } from "react";

interface CopyableTextProps {
  value: string;
  displayValue?: string;
  className?: string;
}

export function CopyableText({ value, displayValue, className = "" }: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span
      onClick={handleCopy}
      className={`relative cursor-pointer transition-opacity hover:opacity-70 ${className}`}
    >
      {displayValue ?? value}
      {copied && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-neutral-800 px-2 py-1 text-xs text-white whitespace-nowrap">
          Copied!
        </span>
      )}
    </span>
  );
}
