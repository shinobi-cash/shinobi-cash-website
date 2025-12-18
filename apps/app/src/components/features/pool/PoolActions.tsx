/**
 * Pool Action Buttons
 * Primary actions for interacting with the selected pool
 * Handles deposit and withdrawal navigation
 */

import { type Asset, useNavigation } from "@/contexts/NavigationContext";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/button";
import { ActionAuthScreen } from "../auth/ActionAuthScreen";

interface PoolAction {
  id: "deposit" | "my-notes";
  icon: React.ReactNode;
  label: string;
  screen: "deposit" | "my-notes";
}

const poolActions: PoolAction[] = [
  { id: "deposit", icon: <Plus className="w-5 h-5" />, label: "Deposit", screen: "deposit" },
  { id: "my-notes", icon: <FileText className="w-5 h-5" />, label: "My Notes", screen: "my-notes" },
];

interface PoolActionsProps {
  asset: Asset;
  disabled?: boolean;
}

export function PoolActions({ asset, disabled = false }: PoolActionsProps) {
  const { currentScreen } = useNavigation();
  const [authScreenOpen, setAuthScreenOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"deposit" | "my-notes">("deposit");

  const handleActionClick = (action: PoolAction) => {
    // Always show unified auth screen - it will handle requirements and navigation
    setSelectedAction(action.id);
    setAuthScreenOpen(true);
  };

  if (authScreenOpen) {
    return (
      <ActionAuthScreen
        action={selectedAction}
        asset={asset}
        onComplete={() => setAuthScreenOpen(false)}
        onBack={() => setAuthScreenOpen(false)}
      />
    );
  }

  return (
    <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex gap-3 min-w-max px-1">
        {poolActions.map((action) => {
          const isActive = currentScreen === action.screen;

          return (
            <Button
              key={action.id}
              onClick={() => handleActionClick(action)}
              disabled={disabled}
              variant={isActive ? "default" : "outline"}
              size="lg"
              className="whitespace-nowrap px-6 h-12 text-sm font-semibold transition-all duration-200 active:scale-95"
            >
              {action.icon}
              <span className="ml-2">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
