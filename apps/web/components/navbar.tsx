"use client";

import { useState, useEffect } from "react";
import { Menu, X, Github } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";

type NavLink = {
  label: string;
  href: string;
  comingSoon?: boolean;
};

const NAV_LINKS: NavLink[] = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "Why Borderless", href: "#why" },
  { label: "FAQ", href: "#faq" },
  { label: "Docs", href: "https://docs.shinobi.cash" },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu on route change or escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-white/10 bg-black/80 shadow-sm backdrop-blur-lg"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between md:h-24">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2 sm:gap-3">
            <Image
              src="/Shinobi.Cash-icon.svg"
              alt="Shinobi Cash"
              width={40}
              height={40}
              className="h-8 w-8 transition-transform group-hover:scale-105 md:h-10 md:w-10"
              priority
            />
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-white md:text-xl">Shinobi Cash</span>
              <span className="text-[10px] text-neutral-400 sm:text-xs">Borderless Privacy</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-8 md:flex">
            {NAV_LINKS.map((link) =>
              link.comingSoon ? (
                <Tooltip key={link.label}>
                  <TooltipTrigger asChild>
                    <span className="cursor-not-allowed text-base font-medium text-neutral-600">
                      {link.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-base font-medium text-neutral-400 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              )
            )}
            <a
              href="https://github.com/shinobi-cash"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 transition-colors hover:text-white"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
            <Button
              asChild
              size="lg"
              className="border-0 bg-gradient-to-r from-orange-500 to-red-500 px-6 py-5 text-base text-white hover:from-orange-600 hover:to-red-600"
            >
              <a href="https://testnet.shinobi.cash" target="_blank" rel="noopener noreferrer">
                Launch App
              </a>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-2 md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="hover:bg-accent rounded-lg p-2 transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-20 border-t border-white/10 bg-black/95 backdrop-blur-lg md:hidden">
          <div className="flex flex-col space-y-1 p-4">
            {NAV_LINKS.map((link) =>
              link.comingSoon ? (
                <span
                  key={link.label}
                  className="cursor-not-allowed rounded-lg px-4 py-3 text-base font-medium text-neutral-600"
                >
                  {link.label}
                  <span className="ml-1.5 text-[10px]">coming soon</span>
                </span>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={handleLinkClick}
                  className="rounded-lg px-4 py-3 text-base font-medium text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  {link.label}
                </a>
              )
            )}
            <a
              href="https://github.com/shinobi-cash"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className="flex items-center gap-2 rounded-lg px-4 py-3 text-base font-medium text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <Github className="h-5 w-5" />
              GitHub
            </a>
            <div className="pt-4">
              <Button
                asChild
                className="w-full border-0 bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
              >
                <a
                  href="https://testnet.shinobi.cash"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleLinkClick}
                >
                  Launch App
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
