/**
 * Withdraw Settings Popover
 * Shows current withdrawal fee configuration with editable solver fee
 */

import { Settings2 } from "lucide-react";
import { useSnapshot } from "valtio";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { FEE_CONFIG } from "@shinobi-cash/constants";
import { WithdrawController, WithdrawSelectors } from "@/controllers/WithdrawController";

export function WithdrawSettings() {
  const state = useSnapshot(WithdrawController.state);
  const isCrossChain = WithdrawSelectors.isCrossChain();
  const maxRelayFeePercent = FEE_CONFIG.MAX_RELAY_FEE_BPS / 100;

  const handleSolverFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      WithdrawController.setSolverFeeBPS(Math.round(value * 100));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-transparent hover:bg-white/10"
          aria-label="Withdraw settings"
        >
          <Settings2 className="h-4 w-4 text-neutral-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 border-white/10 bg-neutral-900 p-4"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white">Withdraw Settings</h4>
            <p className="text-xs text-neutral-500">
              {isCrossChain
                ? "Configure fees for cross-chain withdrawal."
                : "Fee configuration for withdrawal."}
            </p>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Max Relay Fee</span>
              <span className="text-sm text-white">{maxRelayFeePercent}%</span>
            </div>

            {isCrossChain && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-400">Solver Fee</span>
                <div className="relative">
                  <Input
                    id="solverFee"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={(state.solverFeeBPS / 100).toFixed(1)}
                    onChange={handleSolverFeeChange}
                    className="h-7 w-16 border-white/10 bg-white/[0.04] pr-5 text-right text-sm text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                    %
                  </span>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-neutral-500">
            {isCrossChain
              ? "Higher solver fee may result in faster fulfillment."
              : "Relay fee is calculated based on gas costs."}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
