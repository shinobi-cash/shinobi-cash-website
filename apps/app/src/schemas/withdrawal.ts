import { z } from "zod";
import {
  HexStringSchema,
  HexAddressSchema,
  PositiveAmountSchema,
  ChainIdSchema,
  BPSSchema,
  BigIntSchema,
  PositiveBigIntSchema,
  NonNegativeBigIntSchema,
  GasPriceSchema,
} from "./common";

// =============================================================================
// User Input Schemas
// =============================================================================

/** Withdrawal amount input from user */
export const WithdrawalAmountInputSchema = PositiveAmountSchema;

/** Recipient address input from user */
export const RecipientAddressInputSchema = HexAddressSchema;

/** Withdrawal user inputs combined */
export const WithdrawalUserInputSchema = z.object({
  amount: WithdrawalAmountInputSchema,
  recipientAddress: RecipientAddressInputSchema,
  destinationChainId: ChainIdSchema.optional(),
});

export type WithdrawalUserInput = z.infer<typeof WithdrawalUserInputSchema>;

// =============================================================================
// Withdrawal Request Schema
// =============================================================================

export const WithdrawalKindSchema = z.enum(["same-chain", "cross-chain"]);
export type WithdrawalKind = z.infer<typeof WithdrawalKindSchema>;

/** Withdrawal request to be processed (note uses core's Note type, not validated here) */
export const WithdrawalRequestSchema = z.object({
  note: z.object({}).passthrough(),
  withdrawAmountWei: PositiveBigIntSchema,
  recipient: HexAddressSchema,
  accountKey: BigIntSchema,
  destinationChainId: ChainIdSchema.optional(),
});

// =============================================================================
// Fee Quote Schema
// =============================================================================

export const FeeQuoteSchema = z.object({
  kind: WithdrawalKindSchema,
  relayFeeBPS: BPSSchema,
  solverFeeBPS: BPSSchema,
  executionFeeWei: NonNegativeBigIntSchema,
  solverFeeWei: NonNegativeBigIntSchema,
  totalFeeWei: NonNegativeBigIntSchema,
  netAmountWei: NonNegativeBigIntSchema,
  gasPrice: GasPriceSchema,
});

export type FeeQuote = z.infer<typeof FeeQuoteSchema>;

// =============================================================================
// Withdrawal Data Tuple Schema
// =============================================================================

/** Withdrawal data tuple: [processooor, data] */
export const WithdrawalDataTupleSchema = z.tuple([HexStringSchema, HexStringSchema]);

export type WithdrawalDataTuple = z.infer<typeof WithdrawalDataTupleSchema>;

// =============================================================================
// Pipeline Context Schema
// =============================================================================

/** Withdrawal derivation (simplified - from core) */
const WithdrawalDerivationSchema = z.object({
  contextHash: z.string(),
  newNullifier: BigIntSchema,
  newSecret: BigIntSchema,
  existingNullifier: BigIntSchema,
  existingSecret: BigIntSchema,
  existingCommitment: z.string(),
});

/** Crosschain withdrawal derivation extends base */
const CrosschainWithdrawalDerivationSchema = WithdrawalDerivationSchema.extend({
  refundNullifier: BigIntSchema,
  refundSecret: BigIntSchema,
  refundCommitment: z.string(),
});

export const WithdrawalPipelineContextSchema = z.object({
  kind: WithdrawalKindSchema,
  request: WithdrawalRequestSchema,
  feeQuote: FeeQuoteSchema,
  poolScope: BigIntSchema,
  derivation: z.union([WithdrawalDerivationSchema, CrosschainWithdrawalDerivationSchema]),
  withdrawalData: WithdrawalDataTupleSchema,
});

export type WithdrawalPipelineContext = z.infer<typeof WithdrawalPipelineContextSchema>;

// =============================================================================
// Withdrawal Witness Schema
// =============================================================================

export const CircuitInputsSchema = z.object({
  withdrawAmount: BigIntSchema,
  noteAmount: BigIntSchema,
  label: BigIntSchema,
});

export const WithdrawalWitnessSchema = z.object({
  context: WithdrawalPipelineContextSchema,
  stateTreeLeaves: z.array(BigIntSchema),
  aspTreeLeaves: z.array(BigIntSchema),
  circuitInputs: CircuitInputsSchema,
});

export type WithdrawalWitness = z.infer<typeof WithdrawalWitnessSchema>;

// =============================================================================
// Withdrawal Proof Schema
// =============================================================================

export const Groth16ProofSchema = z.object({
  pi_a: z.array(z.string()),
  pi_b: z.array(z.array(z.string())),
  pi_c: z.array(z.string()),
});

export const WithdrawalProofSchema = z.object({
  witness: WithdrawalWitnessSchema,
  proof: Groth16ProofSchema,
  publicSignals: z.array(z.string()),
});

export type WithdrawalProof = z.infer<typeof WithdrawalProofSchema>;

// =============================================================================
// Execution Result Schema
// =============================================================================

export const ExecutionResultSchema = z.object({
  transactionHash: z.string(),
  success: z.boolean(),
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

// =============================================================================
// External Data Schema (from indexer)
// =============================================================================

export const StateTreeLeafSchema = z.object({
  leafValue: z.string(),
});

export const ASPDataSchema = z.object({
  root: z.string(),
  ipfsCID: z.string(),
  timestamp: z.string(),
  approvalList: z.array(z.string()),
});

export const ExternalDataSchema = z.object({
  stateTreeLeaves: z.array(StateTreeLeafSchema),
  aspData: ASPDataSchema,
});

export type ExternalData = z.infer<typeof ExternalDataSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/** Validate withdrawal user input */
export function validateWithdrawalInput(data: unknown) {
  return WithdrawalUserInputSchema.safeParse(data);
}

/** Validate withdrawal request */
export function validateWithdrawalRequest(data: unknown) {
  return WithdrawalRequestSchema.safeParse(data);
}

/** Validate fee quote */
export function validateFeeQuote(data: unknown) {
  return FeeQuoteSchema.safeParse(data);
}

/** Validate withdrawal data tuple */
export function validateWithdrawalDataTuple(data: unknown) {
  return WithdrawalDataTupleSchema.safeParse(data);
}

/** Parse withdrawal data tuple (throws on invalid) */
export function parseWithdrawalDataTuple(data: unknown): WithdrawalDataTuple {
  return WithdrawalDataTupleSchema.parse(data);
}

/** Validate external data from indexer */
export function validateExternalData(data: unknown) {
  return ExternalDataSchema.safeParse(data);
}
