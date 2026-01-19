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
import {
  prepareUserOperation,
  executeUserOperation,
} from "@/services/WithdrawalTransactionService";
import { POOL_CHAIN_ID } from "@/config/chains";

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

  getState(): Readonly<EngineState> {
    return { ...this.state };
  }

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

  async quoteFees(request: WithdrawalRequest): Promise<FeeQuote> {
    validateWithdrawalRequest(request);
    this.state.request = request;
    const feeQuote = await quoteFees(request, POOL_CHAIN_ID);
    this.state.feeQuote = feeQuote;
    this.state.phase = "quoted";
    return feeQuote;
  }

  async prepare(request: WithdrawalRequest): Promise<PreparedUserOperation> {
    validateWithdrawalRequest(request);
    this.state.request = request;

    const feeQuote = await quoteFees(request, POOL_CHAIN_ID);
    this.state.feeQuote = feeQuote;
    this.state.phase = "quoted";

    const context = await buildWithdrawalContext(request, feeQuote);
    this.state.context = context;
    this.state.phase = "context-built";

    const witness = await buildWitness(context);
    this.state.witness = witness;
    this.state.phase = "witness-built";

    const proof = await generateProof(witness);
    this.state.proof = proof;
    this.state.phase = "proof-generated";

    const preparedUserOp = await prepareUserOperation(context, proof);
    this.state.preparedUserOp = preparedUserOp;
    this.state.phase = "prepared";

    return preparedUserOp;
  }

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
