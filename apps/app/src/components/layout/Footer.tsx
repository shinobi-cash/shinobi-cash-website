"use client";

interface FooterProps {
  indicators?: React.ReactNode;
}

export function Footer({ indicators }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background/30 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-sm text-muted-foreground">© Shinobi Cash - {currentYear}</div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a className="text-muted-foreground transition-colors hover:text-foreground">Documentation</a>
            <a className="text-muted-foreground transition-colors hover:text-foreground">Privacy Policy</a>
            <a className="text-muted-foreground transition-colors hover:text-foreground">Terms of Service</a>
            <a className="text-muted-foreground transition-colors hover:text-foreground">GitHub</a>
          </div>

          <div className="flex items-center gap-4">
            {indicators}
            <div className="text-sm text-muted-foreground">v1.0.0</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
