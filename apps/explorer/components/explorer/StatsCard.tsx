import { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  gradient: string;
}

export function StatsCard({ label, value, gradient }: Props) {
  return (
    <div
      className={`bg-linear-to-br relative overflow-hidden rounded-2xl border border-white/10 ${gradient} p-5`}
    >
      <div className="relative z-10">
        <p className="text-xs text-neutral-300">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      </div>

      {/* glow */}
      <div className="pointer-events-none absolute inset-0 bg-white/5 opacity-0 transition-opacity hover:opacity-100" />
    </div>
  );
}
