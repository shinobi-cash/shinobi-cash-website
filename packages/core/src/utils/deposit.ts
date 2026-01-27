/**
 * Deposit Utility Functions
 *
 * Pure functions for deposit classification and fee calculations.
 * These are framework-agnostic and can be used by any app.
 */

/**
 * Type of deposit operation
 */
export type DepositKind = 'same-chain' | 'cross-chain';

/**
 * Classify a deposit as same-chain or cross-chain
 *
 * @param sourceChainId - Chain where deposit originates
 * @param poolChainId - Chain where the privacy pool is deployed
 * @returns Deposit classification
 */
export function classifyDeposit(
  sourceChainId: number,
  poolChainId: number
): DepositKind {
  return sourceChainId === poolChainId ? 'same-chain' : 'cross-chain';
}

/**
 * Calculate compliance fee from deposit amount
 *
 * @param depositAmount - Amount being deposited
 * @param complianceFeeBPS - Compliance fee in basis points (default 100 = 1%)
 * @returns Compliance fee amount
 */
export function calculateComplianceFee(
  depositAmount: number,
  complianceFeeBPS: number = 100
): number {
  return (depositAmount * complianceFeeBPS) / 10000;
}

/**
 * Calculate note amount after compliance fee deduction
 *
 * @param depositAmount - Amount being deposited
 * @param complianceFeeBPS - Compliance fee in basis points (default 100 = 1%)
 * @returns Amount user will receive in their note
 */
export function calculateDepositNoteAmount(
  depositAmount: number,
  complianceFeeBPS: number = 100
): number {
  const fee = calculateComplianceFee(depositAmount, complianceFeeBPS);
  return depositAmount - fee;
}

/**
 * Fee breakdown for deposit display
 */
export interface DepositFeeBreakdown {
  depositAmount: number;
  complianceFee: number;
  noteAmount: number;
  complianceFeeBPS: number;
}

/**
 * Calculate deposit fee breakdown for display
 *
 * @param amount - Deposit amount as string
 * @param complianceFeeBPS - Compliance fee in basis points (default 100 = 1%)
 * @returns Fee breakdown for UI display
 */
export function calculateDepositFeeBreakdown(
  amount: string,
  complianceFeeBPS: number = 100
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
