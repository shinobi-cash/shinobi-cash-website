"use client";

import Image from "next/image";
import Link from "next/link";
import { StatsOverview } from "./StatsOverview";

export function StatsPage() {
  return (
    <div className="bg-linear-to-br flex min-h-screen flex-col from-neutral-950 via-neutral-900 to-black">
      {/* Header */}
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
              <span className="text-[10px] text-neutral-400 sm:text-xs">Pool Stats</span>
            </div>
          </Link>

          <nav className="flex items-center gap-4">
            <Link href="/" className="text-xs font-medium text-white sm:text-sm">
              Stats
            </Link>
            <Link
              href="/activity"
              className="text-xs text-neutral-400 transition hover:text-white sm:text-sm"
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

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Pool Statistics</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Overview of the Shinobi Cash privacy pool on Arbitrum Sepolia
          </p>
        </div>

        <StatsOverview />
      </main>
    </div>
  );
}
