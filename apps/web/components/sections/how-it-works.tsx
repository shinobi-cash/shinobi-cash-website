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
        className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 sm:h-20 sm:w-20 ${
          emphasized
            ? "border-2 border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.15)]"
            : "border border-orange-500/30"
        }`}
      >
        {icon}
      </div>

      {/* Step Number */}
      <div className="mb-2 text-xs font-medium text-orange-400">Step {number}</div>

      {/* Title */}
      <h3 className="mb-3 text-lg font-semibold text-white sm:text-xl">{title}</h3>

      {/* Description */}
      <p className="max-w-xs text-sm leading-relaxed text-neutral-400 sm:text-base">
        {description}
      </p>

      {/* Subtext */}
      {subtext && <p className="mt-2 max-w-xs text-xs text-neutral-500 sm:text-sm">{subtext}</p>}
    </div>
  );
}

const STEPS = [
  {
    title: "Deposit",
    description:
      "Deposit ETH from any supported chain. Your funds enter a single unified privacy pool.",
    subtext: "No manual bridging required.",
    icon: <ArrowDownToLine className="h-7 w-7 text-orange-400 sm:h-8 sm:w-8" />,
    emphasized: false,
  },
  {
    title: "Blend",
    description: "Your deposit blends into a growing pool of users across chains.",
    subtext: "You stay in control — no one can move your funds except you.",
    icon: <Users className="h-7 w-7 text-orange-400 sm:h-8 sm:w-8" />,
    emphasized: true,
  },
  {
    title: "Withdraw",
    description:
      "Withdraw to any chain using a zero-knowledge proof. No one can link your withdrawal to your deposit.",
    icon: <ArrowUpFromLine className="h-7 w-7 text-orange-400 sm:h-8 sm:w-8" />,
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

      <div className="grid gap-8 sm:grid-cols-3 sm:gap-6 md:gap-12">
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
