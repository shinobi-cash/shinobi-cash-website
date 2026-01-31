"use client";

import { Section, SectionHeader } from "@/components/ui/section";

export function WhyBorderlessSection() {
  return (
    <Section id="why">
      <SectionHeader title="Why Privacy Pools Need to Be Borderless" />

      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        {/* The Problem */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
          <div className="text-sm font-medium text-red-400 mb-3">The Problem</div>
          <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4">
            Privacy loves a crowd.
          </h3>
          <div className="space-y-3 text-neutral-400 leading-relaxed">
            <p>Traditional privacy pools live on a single chain.</p>
            <p>Fewer users means fewer lookalikes.</p>
            <p>Fewer lookalikes means your transaction stands out.</p>
          </div>
        </div>

        {/* The Solution */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
          <div className="text-sm font-medium text-orange-400 mb-3">The Solution</div>
          <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4">
            Scaling shouldn&apos;t come at the cost of fragmented privacy.
          </h3>
          <div className="space-y-3 text-neutral-400 leading-relaxed">
            <p>One pool. Every chain. Stronger privacy by default.</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
