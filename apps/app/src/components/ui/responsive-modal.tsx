import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ChevronLeft, X } from "lucide-react";
import type * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@workspace/ui/components/drawer";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
  isWalletModalOpen?: boolean;
  showFooter?: boolean;
  footerContent?: React.ReactNode;
}

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  showBackButton = false,
  onBack,
  className,
  isWalletModalOpen = false,
  showFooter = false,
  footerContent,
}: ResponsiveModalProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");

  if (isDesktop) {
    return (
      <Dialog modal={!isWalletModalOpen} open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={className}
          showCloseButton={false}
          onPointerDownOutside={(e) => {
            if (isWalletModalOpen) e.preventDefault();
          }}
        >
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {showBackButton && onBack && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="h-8 w-8 p-0 hover:bg-app-surface-hover transition-colors duration-200"
                  >
                    <ChevronLeft className="h-4 w-4 text-app-secondary" />
                  </Button>
                )}
                <div>
                  {title && (
                    <DialogTitle className="text-lg font-semibold text-app-primary tracking-tight text-left">
                      {title}
                    </DialogTitle>
                  )}
                  {/* Keep an empty description for ARIA describedby; real description is rendered in content */}
                  <DialogDescription className="sr-only" />
                </div>
              </div>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-app-surface-hover transition-colors duration-200"
                  onClick={() => {
                    // Avoid leaving focus on a control that may become hidden
                    requestAnimationFrame(() => {
                      const active = document.activeElement as HTMLElement | null;
                      if (active && typeof active.blur === "function") active.blur();
                    });
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <X className="h-4 w-4 text-app-secondary" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {description && (
              <div className="px-0 pb-2">
                <p className="text-sm text-left text-app-secondary">{description}</p>
              </div>
            )}
            {children}
          </div>
          {showFooter && <div className="p-4">{footerContent}</div>}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-app-background border-app flex flex-col">
        {/* iOS-style drag handle */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-app-tertiary/30" />

        <DrawerHeader className="pb-0 px-4 pt-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {showBackButton && onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="h-8 w-8 p-0 hover:bg-app-surface-hover transition-colors duration-200"
                >
                  <ChevronLeft className="h-4 w-4 text-app-secondary" />
                </Button>
              )}
              <div className="flex-1">
                {title && (
                  <DrawerTitle className="text-lg font-semibold text-app-primary tracking-tight text-left">
                    {title}
                  </DrawerTitle>
                )}
                {/* Keep an empty description for ARIA describedby; real description is rendered in content */}
                <DrawerDescription className="sr-only" />
              </div>
            </div>
            <DrawerClose
              className="h-8 w-8 flex items-center justify-center hover:bg-app-surface-hover transition-colors duration-200"
              onClick={() => {
                requestAnimationFrame(() => {
                  const active = document.activeElement as HTMLElement | null;
                  if (active && typeof active.blur === "function") active.blur();
                });
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <X className="h-4 w-4 text-app-secondary" />
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {description && (
            <div className="pt-1 pb-2">
              <p className="text-sm text-left text-app-secondary">{description}</p>
            </div>
          )}
          <div className="p-2">{children}</div>
        </div>

        {showFooter && <div className="p-4 mt-auto border-t border-app-border">{footerContent}</div>}
      </DrawerContent>
    </Drawer>
  );
}
