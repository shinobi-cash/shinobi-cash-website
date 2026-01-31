import { ShieldCheck, Lock, Github, Zap } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    label: "Built on Privacy Pools",
  },
  {
    icon: Lock,
    label: "Zero-Knowledge Proofs",
  },
  {
    icon: Github,
    label: "Open Source",
  },
  {
    icon: Zap,
    label: "Live on Testnet",
  },
];

export function TrustStrip() {
  return (
    <div className="border-y border-white/[0.05] bg-white/[0.01]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12 md:gap-x-16">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 text-neutral-400"
            >
              <item.icon className="w-4 h-4 text-orange-400/70" />
              <span className="text-xs sm:text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
