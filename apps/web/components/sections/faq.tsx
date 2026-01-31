"use client";

import { useState } from "react";
import { Section, SectionHeader } from "@/components/ui/section";
import { ChevronDown } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className="border-b border-white/[0.05] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-5 sm:py-6 flex items-center justify-between text-left gap-4 group"
      >
        <span className="text-base sm:text-lg font-medium text-white group-hover:text-orange-400 transition-colors">
          {question}
        </span>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-neutral-400 transition-transform duration-200 flex-shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-96 pb-5 sm:pb-6" : "max-h-0"
        )}
      >
        <p className="text-neutral-400 text-sm sm:text-base leading-relaxed pr-8">
          {answer}
        </p>
      </div>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    question: "How is this different from other privacy solutions?",
    answer:
      "Most privacy tools operate on a single chain, fragmenting users into small pools. Shinobi.Cash aggregates users from multiple chains into one pool, dramatically increasing the anonymity set shared by all users.",
  },
  {
    question: "Is this a mixer?",
    answer:
      "Shinobi.Cash provides mixer-like privacy outcomes, but uses a different cryptographic model — one that preserves ownership proofs and enables compliance without surveillance.",
  },
  {
    question: "Who runs Shinobi.Cash?",
    answer:
      "Shinobi.Cash is built by an independent team focused on privacy-preserving infrastructure. The core smart contracts are immutable and permissionless, minimizing trust in any single party.",
  },
  {
    question: "Can withdrawals be censored or blocked?",
    answer:
      "No. Once your deposit is in the pool, you can always withdraw using a valid zero-knowledge proof. No centralized party can freeze or block your funds.",
  },
  {
    question: "What are Association Set Providers (ASPs)?",
    answer:
      "ASPs maintain lists of deposits that meet specific compliance criteria. When you withdraw, you prove your funds came from a compliant set — without revealing which deposit was yours.",
  },
  {
    question: "Is this open-source and audited?",
    answer:
      "Yes. The smart contracts are fully open-source on GitHub. Shinobi.Cash is currently live on testnet. A professional security audit will be completed before mainnet launch.",
  },
  {
    question: "Which chains are supported?",
    answer:
      "Arbitrum Sepolia and Base Sepolia on testnet. Additional chains will be added for mainnet launch, based on demand and security considerations.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <Section id="faq" className="bg-white/[0.01]">
      <SectionHeader
        title="Frequently Asked Questions"
        subtitle="Everything you need to know about Shinobi.Cash"
      />

      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] px-6 sm:px-8">
          {FAQ_ITEMS.map((item, index) => (
            <FAQItem
              key={item.question}
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}
