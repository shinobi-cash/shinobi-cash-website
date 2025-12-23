import { ChevronLeft } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

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
      className={`hover:bg-app-surface-hover h-8 w-8 p-0 transition-colors duration-200 ${className}`}
      aria-label="Go back"
    >
      <ChevronLeft className="text-app-secondary h-4 w-4" />
    </Button>
  );
}
