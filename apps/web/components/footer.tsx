import Image from "next/image";
import Link from "next/link";
import { Github, Twitter } from "lucide-react";

const FOOTER_LINKS = {
  product: [
    { label: "Launch App", href: "https://testnet.shinobi.cash", external: true },
    { label: "Documentation", href: "https://docs.shinobi.cash", external: true },
  ],
  resources: [
    { label: "GitHub", href: "https://github.com/shinobi-cash", external: true },
    { label: "Privacy Pools Research", href: "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364", external: true },
  ],
};

const SOCIAL_LINKS = [
  { label: "GitHub", href: "https://github.com/shinobi-cash", icon: Github },
  { label: "X", href: "https://x.com/kdsinghsaini", icon: Twitter },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.05] bg-black/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/Shinobi.Cash-icon.svg"
                alt="Shinobi Cash"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-lg font-semibold text-white">Shinobi Cash</span>
            </Link>
            <p className="text-sm text-neutral-400 mb-4">
              Borderless Privacy
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                  aria-label={link.label}
                >
                  <link.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.label}>
                  {"comingSoon" in link && link.comingSoon ? (
                    <span
                      className="text-sm text-neutral-600 cursor-not-allowed"
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
                      className="text-sm text-neutral-400 hover:text-white transition-colors"
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
            <h4 className="text-sm font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div id="contact">
            <h4 className="text-sm font-semibold text-white mb-4">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:hello@shinobi.cash"
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  hello@shinobi.cash
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            &copy; {currentYear} Shinobi.Cash. All rights reserved.
          </p>
          <p className="text-xs text-neutral-600">
            Built on Privacy Pools Protocol
          </p>
        </div>
      </div>
    </footer>
  );
}
