/**
 * Deposit Fee Calculations
 *
 * Re-exports from @shinobi-cash/core for convenience.
 * Fee configuration is in @shinobi-cash/constants.
 */

import { calculateDepositFeeBreakdown } from "@shinobi-cash/core";
import { DEPOSIT_FEES } from "@shinobi-cash/constants";

/**
 * Formats deposit amounts with fee breakdown FOR DISPLAY ONLY
 * Uses floating point math - DO NOT use for on-chain logic
 */
export function formatDepositAmountsForDisplay(amount: string) {
  return calculateDepositFeeBreakdown(amount, DEPOSIT_FEES.COMPLIANCE_FEE_BPS);
}
