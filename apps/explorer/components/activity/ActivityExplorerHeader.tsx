import Image from "next/image";
import Link from "next/link";

export function ActivityExplorerHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <Image
            src="/Shinobi.Cash-icon.svg"
            alt="Shinobi Cash"
            width={32}
            height={32}
            className="h-7 w-7 sm:h-8 sm:w-8"
            priority
          />
          <div className="flex flex-col">
            <span className="text-base font-semibold text-white sm:text-lg">Shinobi Cash</span>
            <span className="text-[10px] text-neutral-400 sm:text-xs">Activity Explorer</span>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs text-neutral-400 transition hover:text-white sm:text-sm"
          >
            Stats
          </Link>
          <Link
            href="/activity"
            className="text-xs font-medium text-white sm:text-sm"
          >
            Activity
          </Link>
          <Link
            href="/intents"
            className="text-xs text-neutral-400 transition hover:text-white sm:text-sm"
          >
            Intents
          </Link>
        </nav>
      </div>
    </header>
  );
}
