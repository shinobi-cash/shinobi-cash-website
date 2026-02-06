import { formatHash } from "@/utils/formatters";
import { CopyableText } from "./CopyableText";

interface HashFieldProps {
  label: string;
  value: string;
}

export function HashField({ label, value }: HashFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-neutral-400">{label}</p>
      <CopyableText
        value={value}
        displayValue={formatHash(value)}
        className="font-mono text-sm text-white"
      />
    </div>
  );
}
