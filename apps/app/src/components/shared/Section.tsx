/**
 * Section Component
 * Reusable container with title header for grouping related content
 */

import type { ReactNode } from "react";

interface SectionProps {
  title: string;
  children: ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="border-b border-white/5 px-3 py-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">{title}</h3>
      </div>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  );
}

interface RowProps {
  label: string;
  value: ReactNode;
}

export function Row({ label, value }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-2 sm:px-3 sm:py-2.5">
      <span className="text-xs text-neutral-400 sm:text-sm">{label}</span>
      <span className="text-right text-xs text-white sm:text-sm">{value}</span>
    </div>
  );
}
