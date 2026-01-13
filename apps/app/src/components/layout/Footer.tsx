"use client";

interface FooterProps {
  indicators?: React.ReactNode;
}

export function Footer({ indicators }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-800 bg-black/30 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-sm text-gray-400">
            © Shinobi Cash - {currentYear}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a className="text-gray-400 transition-colors hover:text-white">
              Documentation
            </a>
            <a className="text-gray-400 transition-colors hover:text-white">
              Privacy Policy
            </a>
            <a className="text-gray-400 transition-colors hover:text-white">
              Terms of Service
            </a>
            <a className="text-gray-400 transition-colors hover:text-white">
              GitHub
            </a>
          </div>

          <div className="flex items-center gap-4">
            {indicators}
            <div className="text-sm text-gray-500">v1.0.0</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
