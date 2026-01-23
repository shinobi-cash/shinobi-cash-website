import { z } from "zod";
import {
  HexAddressSchema,
  PositiveAmountSchema,
  ChainIdSchema,
  BigIntSchema,
  PositiveBigIntSchema,
} from "./common";

// =============================================================================
// User Input Schemas
// =============================================================================

/** Deposit amount input from user */
export const DepositAmountInputSchema = PositiveAmountSchema;

// =============================================================================
// Internal Data Schemas
// =============================================================================

/** Cash note data generated during deposit preparation */
export const CashNoteDataSchema = z.object({
  poolAddress: HexAddressSchema,
  depositIndex: z.number().int().nonnegative(),
  changeIndex: z.literal(0),
  precommitment: BigIntSchema,
});

export type CashNoteData = z.infer<typeof CashNoteDataSchema>;

/** Gas estimate for deposit transaction */
export const GasEstimateSchema = z.object({
  gasCostEth: z.string(),
  gasCostWei: PositiveBigIntSchema,
  gasLimit: PositiveBigIntSchema,
});

export type GasEstimate = z.infer<typeof GasEstimateSchema>;

/** Calculated deposit amounts for display */
export const DepositAmountsSchema = z.object({
  noteAmount: z.number().nonnegative(),
  complianceFee: z.number().nonnegative(),
  solverFee: z.number().nonnegative(),
});

export type DepositAmounts = z.infer<typeof DepositAmountsSchema>;

// =============================================================================
// Deposit Request Schemas
// =============================================================================

/** Same-chain deposit request */
export const SameChainDepositRequestSchema = z.object({
  amount: PositiveAmountSchema,
  noteData: CashNoteDataSchema,
  chainId: ChainIdSchema,
});

export type SameChainDepositRequest = z.infer<typeof SameChainDepositRequestSchema>;

/** Cross-chain deposit request (includes solver fee) */
export const CrossChainDepositRequestSchema = SameChainDepositRequestSchema.extend({
  solverFeeBPS: z.number().int().min(0).max(10000),
});

export type CrossChainDepositRequest = z.infer<typeof CrossChainDepositRequestSchema>;

/** Union of deposit request types */
export const DepositRequestSchema = z.union([
  SameChainDepositRequestSchema,
  CrossChainDepositRequestSchema,
]);

export type DepositRequest = z.infer<typeof DepositRequestSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/** Validate deposit amount input */
export function validateDepositAmount(amount: string) {
  return DepositAmountInputSchema.safeParse(amount);
}

/** Validate cash note data */
export function validateCashNoteData(data: unknown) {
  return CashNoteDataSchema.safeParse(data);
}

/** Validate gas estimate */
export function validateGasEstimate(data: unknown) {
  return GasEstimateSchema.safeParse(data);
}
