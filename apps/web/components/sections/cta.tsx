"use client";

import { Section } from "@/components/ui/section";
import { Button } from "@workspace/ui/components/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <Section id="cta" className="pt-20 sm:pt-24 md:pt-32">
      <div className="relative rounded-[2rem] overflow-hidden">
        {/* Gradient Background - stronger */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/25 via-red-500/15 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/15 via-transparent to-transparent" />

        {/* Content - more padding */}
        <div className="relative px-6 sm:px-12 py-16 sm:py-20 md:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Join a unified cross-chain privacy pool.
          </h2>
          <p className="text-neutral-400 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            Stop fragmenting your privacy across chains. One pool. Maximum anonymity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 px-8 py-6 text-base font-medium"
            >
              <a href="https://testnet.shinobi.cash" target="_blank" rel="noopener noreferrer">
                Launch App
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled
              className="border-white/10 text-neutral-500 px-8 py-6 text-base cursor-not-allowed"
              title="Coming soon"
            >
              Docs
              <span className="ml-1.5 text-[10px] text-neutral-600">soon</span>
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
