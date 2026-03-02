import Image from "next/image";
import Link from "next/link";
import { Github } from "lucide-react";

const FOOTER_LINKS = {
  product: [
    { label: "Launch App", href: "https://testnet.shinobi.cash", external: true },
    { label: "Documentation", href: "https://docs.shinobi.cash", external: true },
  ],
  resources: [
    { label: "GitHub", href: "https://github.com/shinobi-cash", external: true },
    {
      label: "Privacy Pools Research",
      href: "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364",
      external: true,
    },
  ],
};

const SOCIAL_LINKS = [{ label: "GitHub", href: "https://github.com/shinobi-cash", icon: Github }];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.05] bg-black/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2">
              <Image
                src="/Shinobi.Cash-icon.svg"
                alt="Shinobi Cash"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-lg font-semibold text-white">Shinobi Cash</span>
            </Link>
            <p className="mb-4 text-sm text-neutral-400">Borderless Privacy</p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                  aria-label={link.label}
                >
                  <link.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Product</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.label}>
                  {"comingSoon" in link && link.comingSoon ? (
                    <span
                      className="cursor-not-allowed text-sm text-neutral-600"
                      title="Coming soon"
                    >
                      {link.label}
                      <span className="ml-1 text-[10px]">soon</span>
                    </span>
                  ) : (
                    <a
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="text-sm text-neutral-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Resources</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="text-sm text-neutral-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div id="contact">
            <h4 className="mb-4 text-sm font-semibold text-white">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://t.me/+tRxvbyeFuDNmMzUx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-400 transition-colors hover:text-white"
                >
                  Telegram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.05] pt-8 sm:flex-row">
          <p className="text-sm text-neutral-500">
            &copy; {currentYear} Shinobi.Cash. All rights reserved.
          </p>
          <p className="text-xs text-neutral-600">Built on Privacy Pools Protocol</p>
        </div>
      </div>
    </footer>
  );
}
