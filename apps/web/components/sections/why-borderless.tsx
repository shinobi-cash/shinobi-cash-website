"use client";

import { Section, SectionHeader } from "@/components/ui/section";

export function WhyBorderlessSection() {
  return (
    <Section id="why">
      <SectionHeader title="Why Privacy Pools Need to Be Borderless" />

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        {/* The Problem */}
        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6 sm:p-8">
          <div className="mb-3 text-sm font-medium text-red-400">The Problem</div>
          <h3 className="mb-4 text-xl font-semibold text-white sm:text-2xl">
            Privacy loves a crowd.
          </h3>
          <div className="space-y-3 leading-relaxed text-neutral-400">
            <p>Traditional privacy pools live on a single chain.</p>
            <p>Fewer users means fewer lookalikes.</p>
            <p>Fewer lookalikes means your transaction stands out.</p>
          </div>
        </div>

        {/* The Solution */}
        <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-red-500/10 p-6 sm:p-8">
          <div className="mb-3 text-sm font-medium text-orange-400">The Solution</div>
          <h3 className="mb-4 text-xl font-semibold text-white sm:text-2xl">
            Scaling shouldn&apos;t come at the cost of fragmented privacy.
          </h3>
          <div className="space-y-3 leading-relaxed text-neutral-400">
            <p>One pool. Every chain. Stronger privacy by default.</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
