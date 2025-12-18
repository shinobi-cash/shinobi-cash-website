import { ChevronLeft } from "lucide-react";
import { Button } from "./button";

interface BackButtonProps {
  onClick: () => void;
  className?: string;
}

export function BackButton({ onClick, className = "" }: BackButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`h-8 w-8 p-0 hover:bg-app-surface-hover transition-colors duration-200 ${className}`}
      aria-label="Go back"
    >
      <ChevronLeft className="h-4 w-4 text-app-secondary" />
    </Button>
  );
}
