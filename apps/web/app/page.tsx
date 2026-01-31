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
      <section className="relative flex items-center justify-center min-h-svh px-4 overflow-hidden">
        {/* Subtle radial gradient background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[800px] bg-[radial-gradient(circle,_rgba(249,115,22,0.07)_0%,_rgba(239,68,68,0.04)_40%,_transparent_70%)]" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center gap-6 sm:gap-8 text-center max-w-4xl mx-auto">
          <HeroTitle />
          <div className="space-y-3 px-4">
            <p className="text-base sm:text-lg md:text-xl text-neutral-300 max-w-2xl">
              Deposit from any chain. Withdraw to any chain.
            </p>
            <p className="text-sm sm:text-base text-neutral-500 max-w-xl mx-auto">
              Treat the Ethereum ecosystem as a single privacy domain.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-4 mt-2">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 px-8 py-6 text-base font-medium"
              >
                <a
                  href="https://testnet.shinobi.cash"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Launch App
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled
                className="border-white/10 text-neutral-500 px-8 py-6 text-base cursor-not-allowed"
                title="Coming soon"
              >
                Docs
                <span className="ml-1.5 text-[10px] text-neutral-600">soon</span>
              </Button>
            </div>
            {/* Soft CTA */}
            <a
              href="#how-it-works"
              className="text-sm text-neutral-500 hover:text-orange-400 transition-colors flex items-center gap-1"
            >
              Learn how it works
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-neutral-500">
          <ChevronDown className="w-5 h-5 animate-bounce" />
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
