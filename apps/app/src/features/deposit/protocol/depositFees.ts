/**
 * Deposit Fee Calculations
 * Pure functions for fee math - no side effects
 */

const COMPLIANCE_FEE_BPS = 100; // 1% compliance fee (100 basis points)
const BPS_DIVISOR = 10_000;

/**
 * Calculates the compliance fee for a deposit
 * @param depositAmount - Amount being deposited
 * @returns Compliance fee amount
 */
export function calculateComplianceFee(depositAmount: number): number {
  return (depositAmount * COMPLIANCE_FEE_BPS) / BPS_DIVISOR;
}

/**
 * Calculates the note amount after compliance fee deduction
 * @param depositAmount - Amount being deposited
 * @returns Amount user will receive in their note (after 1% fee)
 */
export function calculateDepositNoteAmount(depositAmount: number): number {
  const fee = calculateComplianceFee(depositAmount);
  return depositAmount - fee;
}

/**
 * Formats deposit amounts with fee breakdown FOR DISPLAY ONLY
 * ⚠️ Uses floating point math - DO NOT use for on-chain logic
 * Use parseEther/formatEther for actual transactions
 * @param amount - Deposit amount string
 * @returns Formatted amounts with fee details (for UI display)
 */
export function formatDepositAmountsForDisplay(amount: string) {
  // DISPLAY ONLY - floating point precision acceptable for UI
  const depositAmount = parseFloat(amount) || 0;
  const complianceFee = calculateComplianceFee(depositAmount);
  const noteAmount = calculateDepositNoteAmount(depositAmount);

  return {
    depositAmount,
    complianceFee,
    noteAmount,
    complianceFeeBPS: COMPLIANCE_FEE_BPS,
  };
}
