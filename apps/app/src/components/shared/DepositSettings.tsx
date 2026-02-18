/**
 * Deposit Settings Popover
 * Shows current deposit fee configuration with editable solver fee
 */

import { useState } from "react";
import { Settings2, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useSnapshot } from "valtio";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { FEE_CONFIG } from "@shinobi-cash/constants";
import { DepositController, DepositSelectors } from "@/controllers/DepositController";

export function DepositSettings() {
  const state = useSnapshot(DepositController.state);
  const isCrossChain = DepositSelectors.isCrossChain();
  const isUsingDefaults = DepositSelectors.isUsingDefaultSettings();
  const vettingFeePercent = FEE_CONFIG.VETTING_FEE_BPS / 100;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSolverFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      DepositController.setSolverFeeBPS(Math.round(value * 100));
    }
  };

  const handleFillDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value);
    if (!isNaN(minutes) && minutes >= 1) {
      DepositController.setFillDeadlineSeconds(minutes * 60);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hours = parseInt(e.target.value);
    if (!isNaN(hours) && hours >= 1) {
      DepositController.setExpirySeconds(hours * 3600);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-transparent hover:bg-white/10"
          aria-label="Deposit settings"
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
            <h4 className="text-sm font-medium text-white">Deposit Settings</h4>
            <p className="text-xs text-neutral-500">
              {isCrossChain
                ? "Configure fees for cross-chain deposit."
                : "Fee configuration for deposit."}
            </p>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Vetting Fee</span>
              <span className="text-sm text-white">{vettingFeePercent}%</span>
            </div>

            {isCrossChain && (
              <>
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

                {/* Advanced Settings */}
                <div className="border-t border-white/5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex w-full items-center justify-between text-xs text-neutral-500 hover:text-neutral-400"
                  >
                    <span>Advanced Settings</span>
                    {showAdvanced ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>

                  {showAdvanced && (
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-400">Fill Deadline</span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="1"
                            value={Math.round(state.fillDeadlineSeconds / 60)}
                            onChange={handleFillDeadlineChange}
                            className="h-6 w-14 border-white/10 bg-white/[0.04] text-right text-xs text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="text-xs text-neutral-500">min</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-400">Expiry</span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="1"
                            value={Math.round(state.expirySeconds / 3600)}
                            onChange={handleExpiryChange}
                            className="h-6 w-14 border-white/10 bg-white/[0.04] text-right text-xs text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="text-xs text-neutral-500">hrs</span>
                        </div>
                      </div>

                      {!isUsingDefaults && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => DepositController.resetToDefaults()}
                          className="h-6 w-full text-xs text-neutral-400 hover:text-white"
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Reset to Defaults
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <p className="text-xs text-neutral-500">
            {isCrossChain
              ? "Higher solver fee may result in faster fulfillment."
              : "Vetting fee is fixed by the protocol."}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
