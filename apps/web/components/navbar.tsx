"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Menu, X, Github } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";

const NAV_LINKS = [
  { label: "Docs", href: "https://docs.shinobi.cash" },
  { label: "Contact", href: "#contact" },
] as const;

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-black/80 backdrop-blur-lg border-b border-white/10 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 md:h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            {mounted && (
              <Image
                src={
                  resolvedTheme === "dark"
                    ? "/Shinobi.Cash-white-text.png"
                    : "/Shinobi.Cash-black-text.png"
                }
                width={240}
                height={100}
                alt="Shinobi Cash"
                className="h-8 md:h-10 w-auto transition-transform group-hover:scale-105"
              />
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-base font-medium text-neutral-400 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="https://github.com/shinobi-cash"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-white transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border border-white/10 text-white hover:bg-white/[0.06] hover:border-white/20 text-base px-6 py-5"
            >
              <a href="https://app.shinobi.cash" target="_blank" rel="noopener noreferrer">
                Launch App
              </a>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 top-20 bg-black/95 backdrop-blur-lg border-t border-white/10">
          <div className="flex flex-col space-y-1 p-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                onClick={handleLinkClick}
                className="px-4 py-3 rounded-lg text-base font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="https://github.com/shinobi-cash"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className="px-4 py-3 rounded-lg text-base font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2"
            >
              <Github className="h-5 w-5" />
              GitHub
            </a>
            <div className="pt-4">
              <Button
                asChild
                variant="outline"
                className="w-full border border-white/10 text-white hover:bg-white/[0.06] hover:border-white/20"
              >
                <a href="https://app.shinobi.cash" target="_blank" rel="noopener noreferrer" onClick={handleLinkClick}>
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
