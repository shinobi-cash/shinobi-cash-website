import Image from "next/image";

interface Asset {
  symbol: string;
  name: string;
  icon: string;
}

const ETH: Asset = {
  symbol: "ETH",
  name: "Ethereum",
  icon: "/ethereum.svg",
};

export function AssetSelector() {
  return (
    <div className="bg-white/2 flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
      <div className="flex items-center gap-3">
        <Image src={ETH.icon} alt="Ethereum" width={32} height={32} className="rounded-full bg-white" />

        <div>
          <p className="text-sm font-medium text-white">{ETH.symbol}</p>
          <p className="text-xs text-neutral-400">{ETH.name}</p>
        </div>
      </div>

      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-neutral-300">Pool</span>
    </div>
  );
}
