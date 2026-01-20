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
  showFooterDivider = true,
}: ScreenLayoutProps) {
  return (
    <div className={cn("flex flex-col", containerClassName)}>
      {header}

      <div className={cn("flex-1 overflow-y-auto", contentClassName)}>{children}</div>

      {footer && (
        <div className={cn(showFooterDivider && "border-white/10 border-t", "px-4 py-4")}>
          {footer}
        </div>
      )}
    </div>
  );
}
