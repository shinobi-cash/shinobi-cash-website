import { ReactNode } from "react";
import { cn } from "@workspace/ui/lib/utils";

interface ScreenLayoutProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;

  contentClassName?: string;
  containerClassName?: string;
  showFooterDivider?: boolean;
}

export function ScreenLayout({
  header,
  footer,
  children,
  contentClassName = "px-4 py-6",
  containerClassName = "h-full",
  showFooterDivider = false,
}: ScreenLayoutProps) {
  return (
    <div
      className={cn("flex min-h-0 flex-col overflow-hidden bg-white/[0.02]", containerClassName)}
    >
      {header}

      <div className={cn("min-h-0 flex-1 overflow-y-auto", contentClassName)}>{children}</div>

      {footer && (
        <div className={cn(showFooterDivider && "border-t border-white/10", "px-4 py-4")}>
          {footer}
        </div>
      )}
    </div>
  );
}
