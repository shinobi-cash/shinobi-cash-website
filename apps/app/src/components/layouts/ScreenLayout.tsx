/**
 * ScreenLayout Component
 * Flexible layout wrapper for full-screen views
 */

import { ReactNode } from "react";

interface ScreenLayoutProps {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
  containerClassName?: string;
}

export function ScreenLayout({
  header,
  children,
  footer,
  contentClassName = "px-4 py-6",
  containerClassName = "h-full",
}: ScreenLayoutProps) {
  return (
    <div className={`flex flex-col ${containerClassName}`}>
      {header}
      <div className={`flex-1 overflow-y-auto ${contentClassName}`}>{children}</div>
      {footer && <div className="border-t border-gray-800 px-4 py-4">{footer}</div>}
    </div>
  );
}
