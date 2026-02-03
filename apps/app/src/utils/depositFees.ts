/**
 * Deposit fee calculations
 */

import { FEE_CONFIG } from "@shinobi-cash/constants";

export type DepositKind = "same-chain" | "cross-chain";

export interface DepositFeeBreakdown {
  depositAmount: number;
  complianceFee: number;
  noteAmount: number;
  complianceFeeBPS: number;
}

/**
 * Calculate compliance fee from deposit amount
 */
export function calculateComplianceFee(
  depositAmount: number,
  complianceFeeBPS: number = FEE_CONFIG.VETTING_FEE_BPS
): number {
  return (depositAmount * complianceFeeBPS) / 10000;
}

/**
 * Calculate note amount after compliance fee deduction
 */
export function calculateDepositNoteAmount(
  depositAmount: number,
  complianceFeeBPS: number = FEE_CONFIG.VETTING_FEE_BPS
): number {
  const fee = calculateComplianceFee(depositAmount, complianceFeeBPS);
  return depositAmount - fee;
}

/**
 * Calculate deposit fee breakdown for display
 */
export function calculateDepositFeeBreakdown(
  amount: string,
  complianceFeeBPS: number = FEE_CONFIG.VETTING_FEE_BPS
): DepositFeeBreakdown {
  const depositAmount = parseFloat(amount) || 0;
  const complianceFee = calculateComplianceFee(depositAmount, complianceFeeBPS);
  const noteAmount = calculateDepositNoteAmount(depositAmount, complianceFeeBPS);

  return {
    depositAmount,
    complianceFee,
    noteAmount,
    complianceFeeBPS,
  };
}
