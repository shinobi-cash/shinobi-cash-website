"use client";

import { Section, SectionHeader } from "@/components/ui/section";
import { ArrowDownToLine, Users, ArrowUpFromLine } from "lucide-react";

interface StepProps {
  number: number;
  title: string;
  description: string;
  subtext?: string;
  icon: React.ReactNode;
  emphasized?: boolean;
}

function Step({ number, title, description, subtext, icon, emphasized }: StepProps) {
  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Icon */}
      <div
        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mb-6 ${
          emphasized
            ? "border-2 border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.15)]"
            : "border border-orange-500/30"
        }`}
      >
        {icon}
      </div>

      {/* Step Number */}
      <div className="text-xs font-medium text-orange-400 mb-2">
        Step {number}
      </div>

      {/* Title */}
      <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">
        {title}
      </h3>

      {/* Description */}
      <p className="text-neutral-400 text-sm sm:text-base leading-relaxed max-w-xs">
        {description}
      </p>

      {/* Subtext */}
      {subtext && (
        <p className="text-neutral-500 text-xs sm:text-sm mt-2 max-w-xs">
          {subtext}
        </p>
      )}
    </div>
  );
}

const STEPS = [
  {
    title: "Deposit",
    description:
      "Deposit ETH from any supported chain. Your funds enter a single unified privacy pool.",
    subtext: "No manual bridging required.",
    icon: <ArrowDownToLine className="w-7 h-7 sm:w-8 sm:h-8 text-orange-400" />,
    emphasized: false,
  },
  {
    title: "Blend",
    description:
      "Your deposit blends into a growing pool of users across chains.",
    subtext: "You stay in control — no one can move your funds except you.",
    icon: <Users className="w-7 h-7 sm:w-8 sm:h-8 text-orange-400" />,
    emphasized: true,
  },
  {
    title: "Withdraw",
    description:
      "Withdraw to any chain using a zero-knowledge proof. No one can link your withdrawal to your deposit.",
    icon: <ArrowUpFromLine className="w-7 h-7 sm:w-8 sm:h-8 text-orange-400" />,
    emphasized: false,
  },
];

export function HowItWorksSection() {
  return (
    <Section id="how-it-works">
      <SectionHeader title="How It Works" />

      {/* Visual divider */}
      <div className="relative mb-12">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.05]" />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 md:gap-12">
        {STEPS.map((step, index) => (
          <Step
            key={step.title}
            number={index + 1}
            title={step.title}
            description={step.description}
            subtext={step.subtext}
            icon={step.icon}
            emphasized={step.emphasized}
          />
        ))}
      </div>
    </Section>
  );
}
