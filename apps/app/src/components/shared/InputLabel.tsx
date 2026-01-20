/**
 * Input Label Component
 */

import { ReactNode } from "react";

interface InputLabelProps {
  label?: string;
  labelRight?: ReactNode;
}

export function InputLabel({ label, labelRight }: InputLabelProps) {
  if (!label && !labelRight) return null;

  return (
    <div className="flex items-center justify-between">
      {label && <label className="text-muted-foreground text-sm">{label}</label>}
      {labelRight}
    </div>
  );
}
