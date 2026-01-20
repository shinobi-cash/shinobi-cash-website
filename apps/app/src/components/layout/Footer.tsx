"use client";

interface FooterProps {
  indicators?: React.ReactNode;
}

export function Footer({ indicators }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-white/10 bg-black/60 border-t backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-muted-foreground text-sm">© Shinobi Cash - {currentYear}</div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a className="text-muted-foreground hover:text-foreground transition-colors">
              Documentation
            </a>
            <a className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a className="text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </a>
            <a className="text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
          </div>

          <div className="flex items-center gap-4">
            {indicators}
            <div className="text-muted-foreground text-sm">v1.0.0</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
