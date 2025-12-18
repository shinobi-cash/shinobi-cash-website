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
    <div className="flex items-center justify-between mb-2">
      {label && <label className="text-sm text-gray-400">{label}</label>}
      {labelRight}
    </div>
  );
}
