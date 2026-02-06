import { formatHash } from "@/utils/formatters";
import { getAddressLabel } from "@/utils/addressLabels";
import { CopyableText } from "./CopyableText";

interface AddressFieldProps {
  address: string;
  className?: string;
}

export function AddressField({ address, className }: AddressFieldProps) {
  const label = getAddressLabel(address);
  return (
    <span className={`flex items-center gap-1.5 ${className ?? ""}`}>
      {label && (
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
          {label.name}
        </span>
      )}
      <CopyableText
        value={address}
        displayValue={formatHash(address)}
        className="font-mono text-xs text-neutral-300"
      />
    </span>
  );
}
