"use client";

import { Section, SectionHeader } from "@/components/ui/section";
import { MousePointerClick, Globe, ShieldCheck } from "lucide-react";

interface PillarCardProps {
  title: string;
  description: string;
  subtext?: string;
  icon: React.ReactNode;
}

function PillarCard({ title, description, subtext, icon }: PillarCardProps) {
  return (
    <div className="group p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-orange-500/30 transition-colors duration-300">
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mb-5 group-hover:from-orange-500/30 group-hover:to-red-500/30 transition-colors duration-300">
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">
        {title}
      </h3>

      {/* Description */}
      <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
        {description}
      </p>

      {/* Subtext */}
      {subtext && (
        <p className="text-neutral-500 text-xs sm:text-sm mt-3 leading-relaxed">
          {subtext}
        </p>
      )}
    </div>
  );
}

const PILLARS = [
  {
    title: "Simple",
    description:
      "No complex bridging. No gas token juggling. Deposit and withdraw without multi-step flows.",
    icon: <MousePointerClick className="w-6 h-6 text-orange-400" />,
  },
  {
    title: "Borderless",
    description:
      "One pool. Every chain. Your anonymity set includes everyone — not just users on a single network.",
    icon: <Globe className="w-6 h-6 text-orange-400" />,
  },
  {
    title: "Compliant",
    description:
      "Private, not shady. Prove your funds came from a compliant source, without revealing which deposit is yours.",
    subtext: "Compliance without surveillance.",
    icon: <ShieldCheck className="w-6 h-6 text-orange-400" />,
  },
];

export function PillarsSection() {
  return (
    <Section id="features">
      <SectionHeader
        title="Built Different"
        subtitle="Privacy that works for everyone — without compromises."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {PILLARS.map((pillar) => (
          <PillarCard
            key={pillar.title}
            title={pillar.title}
            description={pillar.description}
            subtext={pillar.subtext}
            icon={pillar.icon}
          />
        ))}
      </div>
    </Section>
  );
}
