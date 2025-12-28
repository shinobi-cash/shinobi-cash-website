/**
 * Withdrawal Engine
 *
 * Stateful orchestrator that coordinates the complete withdrawal pipeline.
 * Each stage produces an immutable artifact consumed by the next stage.
 */

import type {
  WithdrawalRequest,
  FeeQuote,
  WithdrawalContext,
  WithdrawalWitness,
  WithdrawalProof,
  PreparedUserOperation,
  ExecutionResult,
} from "../domain/types";
import { validateWithdrawalRequest } from "../domain/invariants";
import { quoteFees } from "../services/feeQuoteService";
import { buildWithdrawalContext } from "../services/contextService";
import { buildWitness } from "../services/witnessService";
import { generateProof } from "../services/proofService";
import { prepareUserOperation, executeUserOperation } from "../services/transactionService";
import { POOL_CHAIN_ID } from "@/config/chains";

// ============ ENGINE STATE ============

interface EngineState {
  request: WithdrawalRequest | null;
  feeQuote: FeeQuote | null;
  context: WithdrawalContext | null;
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

    // Stage 3: Build context
    const context = await buildWithdrawalContext(request, feeQuote);
    this.state.context = context;

    // Stage 4: Build witness
    const witness = await buildWitness(context);
    this.state.witness = witness;

    // Stage 5: Generate proof
    const proof = await generateProof(witness);
    this.state.proof = proof;

    // Stage 6: Prepare UserOperation
    const preparedUserOp = await prepareUserOperation(context, proof);
    this.state.preparedUserOp = preparedUserOp;

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

    return result;
  }

  /**
   * Complete withdrawal (prepare + execute)
   *
   * @param request - Withdrawal request
   * @returns Execution result
   */
  async processComplete(request: WithdrawalRequest): Promise<ExecutionResult> {
    await this.prepare(request);
    return this.execute();
  }
}
