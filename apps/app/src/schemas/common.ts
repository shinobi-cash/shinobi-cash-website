import { z } from "zod";

// =============================================================================
// Primitive Schemas
// =============================================================================

/** Hex string starting with 0x */
export const HexStringSchema = z
  .string()
  .refine((s): s is `0x${string}` => s.startsWith("0x"), {
    message: "Expected hex string starting with 0x",
  });

/** Valid Ethereum address (0x + 40 hex chars) */
export const HexAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address")
  .transform((s) => s.toLowerCase() as `0x${string}`);

/** Transaction hash (0x + 64 hex chars) */
export const TxHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash");

/** Numeric string that can be parsed as BigInt */
export const BigIntStringSchema = z.string().refine(
  (s) => {
    try {
      BigInt(s);
      return true;
    } catch {
      return false;
    }
  },
  { message: "Invalid BigInt string" }
);

/** Positive numeric string (for amounts) */
export const PositiveAmountSchema = z
  .string()
  .regex(/^\d+\.?\d*$/, "Amount must be a positive number")
  .refine((s) => parseFloat(s) > 0, "Amount must be greater than 0");

/** Chain ID (positive integer) */
export const ChainIdSchema = z.number().int().positive();

/** BPS value (0-10000) */
export const BPSSchema = z.number().int().min(0).max(10000);

// =============================================================================
// BigInt Schemas (for runtime values)
// =============================================================================

/** Schema for BigInt values */
export const BigIntSchema = z.bigint();

/** Positive BigInt (for wei amounts) */
export const PositiveBigIntSchema = z.bigint().positive();

/** Non-negative BigInt */
export const NonNegativeBigIntSchema = z.bigint().nonnegative();

// =============================================================================
// Gas Price Schema
// =============================================================================

export const GasPriceSchema = z.object({
  maxFeePerGas: BigIntSchema,
  maxPriorityFeePerGas: BigIntSchema,
});

export type GasPrice = z.infer<typeof GasPriceSchema>;
