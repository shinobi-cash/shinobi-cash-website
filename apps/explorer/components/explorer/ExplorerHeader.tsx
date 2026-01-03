export function ExplorerHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-white">Shinobi Cash</span>
          <span className="text-xs text-neutral-400">Pool Explorer</span>
        </div>

        <div className="text-xs text-neutral-400">Ethereum · Testnet Pool</div>
      </div>
    </header>
  );
}
