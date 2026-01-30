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
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5">
        <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{title}</h3>
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
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="text-sm text-neutral-400">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}
