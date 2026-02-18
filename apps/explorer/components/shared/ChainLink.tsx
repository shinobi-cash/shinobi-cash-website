import { getChainName, getTxExplorerUrl } from "@/config/chains";

interface ChainLinkProps {
  label: string;
  chainId: string | number | bigint;
  txHash?: string;
}

export function ChainLink({ label, chainId, txHash }: ChainLinkProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-neutral-400">{label}</p>
      {txHash ? (
        <a
          href={getTxExplorerUrl(chainId, txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-white transition-colors hover:text-orange-400"
        >
          {getChainName(chainId)}
          <span className="text-neutral-500">↗</span>
        </a>
      ) : (
        <p className="text-sm text-white">{getChainName(chainId)}</p>
      )}
    </div>
  );
}
