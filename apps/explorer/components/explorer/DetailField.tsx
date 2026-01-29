import type { ReactNode } from "react";

interface DetailFieldProps {
  label: string;
  children: ReactNode;
}

export function DetailField({ label, children }: DetailFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-neutral-400">{label}</p>
      <div className="text-sm text-white">{children}</div>
    </div>
  );
}
