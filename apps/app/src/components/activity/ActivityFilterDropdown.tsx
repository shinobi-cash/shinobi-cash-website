/**
 * Activity Filter Dropdown Component
 *
 * Dropdown menu for filtering activities by type using shadcn components.
 */

"use client";

import { Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Button } from "@workspace/ui/components/button";
import type { ActivityFilter } from "@/types/activity";
import { ACTIVITY_FILTER_LABELS } from "@/types/activity";

interface ActivityFilterDropdownProps {
  activeFilter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
  counts: {
    total: number;
    deposit: number;
    withdrawal: number;
    refund: number;
  };
}

const FILTER_OPTIONS: { value: ActivityFilter; dotColor: string }[] = [
  { value: "all", dotColor: "bg-zinc-400" },
  { value: "deposit", dotColor: "bg-green-500" },
  { value: "withdrawal", dotColor: "bg-blue-500" },
  // { value: "refund", dotColor: "bg-yellow-500" },
];

export function ActivityFilterDropdown({
  activeFilter,
  onFilterChange,
  counts,
}: ActivityFilterDropdownProps) {
  const getCount = (filter: ActivityFilter): number => {
    switch (filter) {
      case "all":
        return counts.total;
      case "deposit":
        return counts.deposit;
      case "withdrawal":
        return counts.withdrawal;
      case "refund":
        return counts.refund;
      default:
        return 0;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          {ACTIVITY_FILTER_LABELS[activeFilter]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-border bg-background w-48 p-1">
        {FILTER_OPTIONS.map((option) => {
          const count = getCount(option.value);
          const isActive = activeFilter === option.value;

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={`cursor-pointer justify-between ${
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                {isActive && <div className={`h-1.5 w-1.5 rounded-full ${option.dotColor}`} />}
                {ACTIVITY_FILTER_LABELS[option.value]}
              </span>
              <span className="text-muted-foreground text-xs">({count})</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
