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
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12 md:gap-x-16">
          {TRUST_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-neutral-400">
              <item.icon className="h-4 w-4 text-orange-400/70" />
              <span className="text-xs font-medium sm:text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
