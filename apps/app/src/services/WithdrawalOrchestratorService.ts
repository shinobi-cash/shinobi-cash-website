/**
 * Withdrawal Engine
 *
 * Stateful orchestrator that coordinates the complete withdrawal pipeline.
 * Each stage produces an immutable artifact consumed by the next stage.
 */

import type {
  WithdrawalRequest,
  FeeQuote,
  WithdrawalPipelineContext,
  WithdrawalWitness,
  WithdrawalProof,
  PreparedUserOperation,
  ExecutionResult,
} from "@/types/withdrawal";
import { validateWithdrawalRequest } from "@/utils/withdrawalInvariants";
import { quoteFees } from "@/services/WithdrawalFeeQuoteService";
import { buildWithdrawalContext } from "@/services/WithdrawalContextService";
import { buildWitness } from "@/services/WithdrawalWitnessService";
import { generateProof } from "@/services/WithdrawalProofService";
import { prepareUserOperation, executeUserOperation } from "@/services/WithdrawalTransactionService";
import { POOL_CHAIN_ID } from "@/config/chains";

// ============ ENGINE STATE ============

/**
 * Engine lifecycle phases
 *
 * Explicit state machine for withdrawal pipeline progression.
 * Provides guardrails against invalid transitions and better debugging.
 */
export type EnginePhase =
  | "idle"
  | "quoted"
  | "context-built"
  | "witness-built"
  | "proof-generated"
  | "prepared"
  | "executed";

interface EngineState {
  phase: EnginePhase;
  request: WithdrawalRequest | null;
  feeQuote: FeeQuote | null;
  context: WithdrawalPipelineContext | null;
  witness: WithdrawalWitness | null;
  proof: WithdrawalProof | null;
  preparedUserOp: PreparedUserOperation | null;
  executionResult: ExecutionResult | null;
}

// ============ ENGINE CLASS ============

/**
 * Withdrawal Engine
 *
 * Orchestrates the withdrawal pipeline from request to execution.
 * Maintains state of each pipeline stage for debugging and resumability.
 */
export class WithdrawalEngine {
  private state: EngineState = {
    phase: "idle",
    request: null,
    feeQuote: null,
    context: null,
    witness: null,
    proof: null,
    preparedUserOp: null,
    executionResult: null,
  };

  /**
   * Get current pipeline state (for debugging)
   */
  getState(): Readonly<EngineState> {
    return { ...this.state };
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.state = {
      phase: "idle",
      request: null,
      feeQuote: null,
      context: null,
      witness: null,
      proof: null,
      preparedUserOp: null,
      executionResult: null,
    };
  }

  /**
   * Stage 1: Quote fees for withdrawal
   *
   * @param request - Withdrawal request
   * @returns Fee quote
   */
  async quoteFees(request: WithdrawalRequest): Promise<FeeQuote> {
    // Validate request
    validateWithdrawalRequest(request);

    // Store request
    this.state.request = request;

    // Generate fee quote
    const feeQuote = await quoteFees(request, POOL_CHAIN_ID);
    this.state.feeQuote = feeQuote;
    this.state.phase = "quoted";

    return feeQuote;
  }

  /**
   * Prepare withdrawal (all stages up to UserOp)
   *
   * Runs the complete pipeline from request to prepared UserOperation.
   * Each stage produces an immutable artifact.
   *
   * @param request - Withdrawal request
   * @returns Prepared UserOperation ready for execution
   */
  async prepare(request: WithdrawalRequest): Promise<PreparedUserOperation> {
    // Stage 1: Validate request
    validateWithdrawalRequest(request);
    this.state.request = request;

    // Stage 2: Quote fees
    const feeQuote = await quoteFees(request, POOL_CHAIN_ID);
    this.state.feeQuote = feeQuote;
    this.state.phase = "quoted";

    // Stage 3: Build context
    const context = await buildWithdrawalContext(request, feeQuote);
    this.state.context = context;
    this.state.phase = "context-built";

    // Stage 4: Build witness
    const witness = await buildWitness(context);
    this.state.witness = witness;
    this.state.phase = "witness-built";

    // Stage 5: Generate proof
    const proof = await generateProof(witness);
    this.state.proof = proof;
    this.state.phase = "proof-generated";

    // Stage 6: Prepare UserOperation
    const preparedUserOp = await prepareUserOperation(context, proof);
    this.state.preparedUserOp = preparedUserOp;
    this.state.phase = "prepared";

    return preparedUserOp;
  }

  /**
   * Execute prepared withdrawal
   *
   * @returns Execution result with transaction hash
   * @throws Error if not prepared
   */
  async execute(): Promise<ExecutionResult> {
    if (!this.state.preparedUserOp) {
      throw new Error("Withdrawal not prepared. Call prepare() first.");
    }

    const result = await executeUserOperation(this.state.preparedUserOp);
    this.state.executionResult = result;
    this.state.phase = "executed";

    return result;
  }
}
