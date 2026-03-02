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
    <div className="group rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6 transition-colors duration-300 hover:border-orange-500/30 sm:p-8">
      {/* Icon */}
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 transition-colors duration-300 group-hover:from-orange-500/30 group-hover:to-red-500/30">
        {icon}
      </div>

      {/* Title */}
      <h3 className="mb-3 text-lg font-semibold text-white sm:text-xl">{title}</h3>

      {/* Description */}
      <p className="text-sm leading-relaxed text-neutral-400 sm:text-base">{description}</p>

      {/* Subtext */}
      {subtext && (
        <p className="mt-3 text-xs leading-relaxed text-neutral-500 sm:text-sm">{subtext}</p>
      )}
    </div>
  );
}

const PILLARS = [
  {
    title: "Simple",
    description:
      "No complex bridging. No gas token juggling. Deposit and withdraw without multi-step flows.",
    icon: <MousePointerClick className="h-6 w-6 text-orange-400" />,
  },
  {
    title: "Borderless",
    description:
      "One pool. Every chain. Your anonymity set includes everyone — not just users on a single network.",
    icon: <Globe className="h-6 w-6 text-orange-400" />,
  },
  {
    title: "Compliant",
    description:
      "Private, not shady. Prove your funds came from a compliant source, without revealing which deposit is yours.",
    subtext: "Compliance without surveillance.",
    icon: <ShieldCheck className="h-6 w-6 text-orange-400" />,
  },
];

export function PillarsSection() {
  return (
    <Section id="features">
      <SectionHeader
        title="Built Different"
        subtitle="Privacy that works for everyone — without compromises."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
