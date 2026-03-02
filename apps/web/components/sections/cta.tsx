"use client";

import { Section } from "@/components/ui/section";
import { Button } from "@workspace/ui/components/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <Section id="cta" className="pt-20 sm:pt-24 md:pt-32">
      <div className="relative overflow-hidden rounded-[2rem]">
        {/* Gradient Background - stronger */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/25 via-red-500/15 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/15 via-transparent to-transparent" />

        {/* Content - more padding */}
        <div className="relative px-6 py-16 text-center sm:px-12 sm:py-20 md:py-24">
          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
            Join a unified cross-chain privacy pool.
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-base text-neutral-400 sm:text-lg">
            Stop fragmenting your privacy across chains. One pool. Maximum anonymity.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="border-0 bg-gradient-to-r from-orange-500 to-red-500 px-8 py-6 text-base font-medium text-white hover:from-orange-600 hover:to-red-600"
            >
              <a href="https://testnet.shinobi.cash" target="_blank" rel="noopener noreferrer">
                Launch App
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white/10 px-8 py-6 text-base hover:bg-white/5"
              asChild
            >
              <a href="https://docs.shinobi.cash" target="_blank" rel="noopener noreferrer">
                Docs
              </a>
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
