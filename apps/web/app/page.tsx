import HeroTitle from "@/components/hero-title";
import { Footer } from "@/components/footer";
import { TrustStrip } from "@/components/trust-strip";
import {
  WhyBorderlessSection,
  HowItWorksSection,
  PillarsSection,
  FAQSection,
  CTASection,
} from "@/components/sections";
import { Button } from "@workspace/ui/components/button";
import { ArrowRight, ChevronDown } from "lucide-react";

export default function Page() {
  return (
    <main>
      {/* Hero Section */}
      <section className="bg-linear-to-br relative flex min-h-svh items-center justify-center overflow-hidden from-neutral-950 via-neutral-900 to-black px-4">
        {/* Subtle radial gradient background */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] bg-[radial-gradient(circle,_rgba(249,115,22,0.10)_0%,_rgba(239,68,68,0.06)_40%,_transparent_70%)]" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center justify-center gap-6 text-center sm:gap-8">
          <HeroTitle />
          <div className="space-y-3 px-4">
            <p className="max-w-2xl text-base text-neutral-300 sm:text-lg md:text-xl">
              Deposit from any chain. Withdraw to any chain.
            </p>
            <p className="mx-auto max-w-xl text-sm text-neutral-500 sm:text-base">
              Treat the Ethereum ecosystem as a single privacy domain.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="mt-2 flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="border-0 bg-gradient-to-r from-orange-500 to-red-500 px-8 py-6 text-base font-medium text-white hover:from-orange-600 hover:to-red-600"
              >
                <a href="https://testnet.shinobi.cash" target="_blank" rel="noopener noreferrer">
                  Launch App
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/10 px-8 py-6 text-base hover:bg-white/5"
                asChild
              >
                <a href="https://docs.shinobi.cash" target="_blank" rel="noopener noreferrer">
                  Docs
                </a>
              </Button>
            </div>
            {/* Soft CTA */}
            <a
              href="#how-it-works"
              className="flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-orange-400"
            >
              Learn how it works
              <ChevronDown className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-neutral-500">
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      </section>

      {/* Trust Strip */}
      <TrustStrip />

      {/* Content Sections */}
      <PillarsSection />
      <WhyBorderlessSection />
      <HowItWorksSection />
      <FAQSection />
      <CTASection />

      {/* Footer */}
      <Footer />
    </main>
  );
}
