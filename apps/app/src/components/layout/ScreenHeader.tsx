import { ChevronRight } from "lucide-react";
import { BackButton } from "../ui/back-button";

interface BreadcrumbItem {
  label: string;
  screen?: "home" | "my-notes";
}

interface ScreenHeaderProps {
  title?: string;
  backTo?: "home" | "my-notes";
  showBackButton?: boolean;
  breadcrumbs?: BreadcrumbItem[];
}

export function ScreenHeader({ title, backTo = "home", showBackButton = true, breadcrumbs }: ScreenHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-app-background border-b border-app-border">
      {showBackButton && <BackButton to={backTo} />}

      {breadcrumbs ? (
        <div className="flex items-center gap-2">
          {breadcrumbs.map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex items-center gap-2">
              <span
                className={`text-sm ${
                  index === breadcrumbs.length - 1 ? "font-semibold text-app-primary" : "text-app-secondary"
                }`}
              >
                {item.label}
              </span>
              {index < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 text-app-tertiary" />}
            </div>
          ))}
        </div>
      ) : (
        <h1 className="text-lg font-semibold text-app-primary tracking-tight">{title}</h1>
      )}
    </div>
  );
}
