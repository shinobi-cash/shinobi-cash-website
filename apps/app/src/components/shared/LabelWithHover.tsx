/**
 * LabelWithHover Component
 * Generic component that shows primary content with additional details on hover
 */

import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";

interface LabelWithHoverProps {
  children: React.ReactNode;
  hoverText: string;
  className?: string;
}

export function LabelWithHover({ children, hoverText, className }: LabelWithHoverProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className}>{children}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{hoverText}</p>
      </TooltipContent>
    </Tooltip>
  );
}
