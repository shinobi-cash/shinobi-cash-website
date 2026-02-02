import type {
  WithdrawalPipelineContext,
  WithdrawalWitness,
  WithdrawalProof,
  PreparedUserOperation,
  ExecutionResult,
  FeeQuote,
  WithdrawalRequest,
  Withdraw2Request,
  Withdraw2PipelineContext,
  Withdraw2Witness,
  Withdraw2Proof,
} from "@/types/withdrawal";
import { Errors } from "@/lib/errors/errors";
import {
  validateWithdrawalRequest,
  validateWithdrawalContext,
  validateWithdraw2Request,
  validateWithdraw2Context,
} from "@/utils/withdrawalInvariants";
import { quoteFees, quoteWithdraw2Fees as quoteWithdraw2FeesUtil } from "@/utils/withdrawalFees";
import {
  prepareUserOperation,
  executeUserOperation,
  prepareWithdraw2UserOperation,
} from "@/utils/withdrawalTransaction";
import {
  createWithdrawalData,
  createCrossChainWithdrawalData,
  fetchPoolScope,
} from "@/utils/withdrawalContract";
import { fetchASPData, fetchStateTreeLeaves } from "@/utils/indexer";
import { withdrawalProofGenerator } from "@/services/ProofGeneratorService";
import {
  deriveWithdrawalInputs,
  deriveCrosschainWithdrawalInputs,
  deriveWithdraw2Inputs,
  deriveCrosschainWithdraw2Inputs,
} from "@shinobi-cash/core/withdrawal";
import {
  buildWithdrawalCircuitWitness,
  buildCrosschainWithdrawalCircuitWitness,
  buildWithdraw2CircuitWitness,
  buildCrosschainWithdraw2CircuitWitness,
} from "@shinobi-cash/core/proof";
import {
  SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER,
} from "@shinobi-cash/constants";
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
  request: WithdrawalRequest | Withdraw2Request | null;
  feeQuote: FeeQuote | null;
  context: WithdrawalPipelineContext | Withdraw2PipelineContext | null;
  witness: WithdrawalWitness | Withdraw2Witness | null;
  proof: WithdrawalProof | Withdraw2Proof | null;
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

    // Step 1: Quote fees
    const feeQuote = await quoteFees(request, POOL_CHAIN_ID);
    this.state.feeQuote = feeQuote;
    this.state.phase = "quoted";

    // Step 2: Build context (inlined from WithdrawalContextService)
    const context = await this.buildContext(request, feeQuote);
    this.state.context = context;
    this.state.phase = "context-built";

    // Step 3: Build witness (inlined from WithdrawalWitnessService)
    const witness = await this.buildWitness(context);
    this.state.witness = witness;
    this.state.phase = "witness-built";

    // Step 4: Generate proof (inlined from WithdrawalProofService)
    const proof = await this.generateProof(witness);
    this.state.proof = proof;
    this.state.phase = "proof-generated";

    // Step 5: Prepare user operation
    const preparedUserOp = await prepareUserOperation(context, proof);
    this.state.preparedUserOp = preparedUserOp;
    this.state.phase = "prepared";

    return preparedUserOp;
  }

  async execute(): Promise<ExecutionResult> {
    if (!this.state.preparedUserOp) {
      throw Errors.withdrawal.precondition("Withdrawal not prepared");
    }
    const result = await executeUserOperation(this.state.preparedUserOp);
    this.state.executionResult = result;
    this.state.phase = "executed";
    return result;
  }

  private async buildContext(
    request: WithdrawalRequest,
    feeQuote: FeeQuote
  ): Promise<WithdrawalPipelineContext> {
    const poolScopeString = await fetchPoolScope();
    const poolScope = BigInt(poolScopeString);

    const withdrawalData =
      feeQuote.kind === "cross-chain"
        ? createCrossChainWithdrawalData(
            request.recipient,
            request.destinationChainId!,
            SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER.address,
            BigInt(feeQuote.relayFeeBPS),
            BigInt(feeQuote.solverFeeBPS)
          )
        : createWithdrawalData(
            request.recipient,
            SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER.address,
            BigInt(feeQuote.relayFeeBPS)
          );

    const derivation =
      feeQuote.kind === "cross-chain"
        ? deriveCrosschainWithdrawalInputs(
            request.note,
            request.accountKey,
            request.note.poolAddress,
            poolScope,
            withdrawalData
          )
        : deriveWithdrawalInputs(
            request.note,
            request.accountKey,
            request.note.poolAddress,
            poolScope,
            withdrawalData
          );

    const context: WithdrawalPipelineContext = {
      kind: feeQuote.kind,
      request,
      feeQuote,
      poolScope,
      derivation,
      withdrawalData,
    };

    validateWithdrawalContext(context);
    return context;
  }

  private async buildWitness(context: WithdrawalPipelineContext): Promise<WithdrawalWitness> {
    const poolAddress = context.request.note.poolAddress.toLowerCase();

    const [stateTreeLeavesRaw, aspData] = await Promise.all([
      fetchStateTreeLeaves(poolAddress),
      fetchASPData(),
    ]);

    const stateTreeLeaves = stateTreeLeavesRaw.map((leaf) => BigInt(leaf.leafValue));
    const aspTreeLeaves = aspData.approvalList.map((label: string) => BigInt(label));

    const circuitInputs = {
      withdrawAmount: context.request.withdrawAmountWei,
      noteAmount: BigInt(context.request.note.amount),
      label: BigInt(context.request.note.label),
    };

    return { context, stateTreeLeaves, aspTreeLeaves, circuitInputs };
  }

  private async generateProof(witness: WithdrawalWitness): Promise<WithdrawalProof> {
    const { context, stateTreeLeaves, aspTreeLeaves, circuitInputs } = witness;

    if (context.kind === "cross-chain") {
      const circuitWitness = buildCrosschainWithdrawalCircuitWitness(
        context.derivation as Parameters<typeof buildCrosschainWithdrawalCircuitWitness>[0],
        stateTreeLeaves,
        aspTreeLeaves,
        circuitInputs
      );
      const proofData =
        await withdrawalProofGenerator.generateCrosschainWithdrawalProof(circuitWitness);
      return { witness, proof: proofData.proof, publicSignals: proofData.publicSignals };
    }

    const circuitWitness = buildWithdrawalCircuitWitness(
      context.derivation as Parameters<typeof buildWithdrawalCircuitWitness>[0],
      stateTreeLeaves,
      aspTreeLeaves,
      circuitInputs
    );
    const proofData = await withdrawalProofGenerator.generateWithdrawalProof(circuitWitness);
    return { witness, proof: proofData.proof, publicSignals: proofData.publicSignals };
  }

  // ============ WITHDRAW2 (2:1) METHODS ============

  async quoteWithdraw2Fees(request: Withdraw2Request): Promise<FeeQuote> {
    validateWithdraw2Request(request);
    this.state.request = request;
    const feeQuote = await quoteWithdraw2FeesUtil(request, POOL_CHAIN_ID);
    this.state.feeQuote = feeQuote;
    this.state.phase = "quoted";
    return feeQuote;
  }

  async prepareWithdraw2(request: Withdraw2Request): Promise<PreparedUserOperation> {
    validateWithdraw2Request(request);
    this.state.request = request;

    // Step 1: Quote fees
    const feeQuote = await quoteWithdraw2FeesUtil(request, POOL_CHAIN_ID);
    this.state.feeQuote = feeQuote;
    this.state.phase = "quoted";

    // Step 2: Build context
    const context = await this.buildWithdraw2Context(request, feeQuote);
    this.state.context = context;
    this.state.phase = "context-built";

    // Step 3: Build witness
    const witness = await this.buildWithdraw2Witness(context);
    this.state.witness = witness;
    this.state.phase = "witness-built";

    // Step 4: Generate proof
    const proof = await this.generateWithdraw2Proof(witness);
    this.state.proof = proof;
    this.state.phase = "proof-generated";

    // Step 5: Prepare user operation
    const preparedUserOp = await prepareWithdraw2UserOperation(context, proof);
    this.state.preparedUserOp = preparedUserOp;
    this.state.phase = "prepared";

    return preparedUserOp;
  }

  private async buildWithdraw2Context(
    request: Withdraw2Request,
    feeQuote: FeeQuote
  ): Promise<Withdraw2PipelineContext> {
    const poolScopeString = await fetchPoolScope();
    const poolScope = BigInt(poolScopeString);

    const withdrawalData =
      feeQuote.kind === "cross-chain"
        ? createCrossChainWithdrawalData(
            request.recipient,
            request.destinationChainId!,
            SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER.address,
            BigInt(feeQuote.relayFeeBPS),
            BigInt(feeQuote.solverFeeBPS)
          )
        : createWithdrawalData(
            request.recipient,
            SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER.address,
            BigInt(feeQuote.relayFeeBPS)
          );

    const labelSelector = request.labelSelector ?? 0;
    const derivation =
      feeQuote.kind === "cross-chain"
        ? deriveCrosschainWithdraw2Inputs(
            request.primaryNote,
            request.secondaryNote,
            request.accountKey,
            request.primaryNote.poolAddress,
            poolScope,
            withdrawalData,
            labelSelector
          )
        : deriveWithdraw2Inputs(
            request.primaryNote,
            request.secondaryNote,
            request.accountKey,
            request.primaryNote.poolAddress,
            poolScope,
            withdrawalData,
            labelSelector
          );

    const context: Withdraw2PipelineContext = {
      kind: feeQuote.kind,
      request,
      feeQuote,
      poolScope,
      derivation,
      withdrawalData,
    };

    validateWithdraw2Context(context);
    return context;
  }

  private async buildWithdraw2Witness(context: Withdraw2PipelineContext): Promise<Withdraw2Witness> {
    const poolAddress = context.request.primaryNote.poolAddress.toLowerCase();

    const [stateTreeLeavesRaw, aspData] = await Promise.all([
      fetchStateTreeLeaves(poolAddress),
      fetchASPData(),
    ]);

    const stateTreeLeaves = stateTreeLeavesRaw.map((leaf) => BigInt(leaf.leafValue));
    const aspTreeLeaves = aspData.approvalList.map((label: string) => BigInt(label));

    const circuitInputs = {
      withdrawAmount: context.request.withdrawAmountWei,
      primaryNoteAmount: BigInt(context.request.primaryNote.amount),
      primaryLabel: BigInt(context.request.primaryNote.label),
      secondaryNoteAmount: BigInt(context.request.secondaryNote.amount),
      secondaryLabel: BigInt(context.request.secondaryNote.label),
    };

    return { context, stateTreeLeaves, aspTreeLeaves, circuitInputs };
  }

  private async generateWithdraw2Proof(witness: Withdraw2Witness): Promise<Withdraw2Proof> {
    const { context, stateTreeLeaves, aspTreeLeaves, circuitInputs } = witness;

    if (context.kind === "cross-chain") {
      const circuitWitness = buildCrosschainWithdraw2CircuitWitness(
        context.derivation as Parameters<typeof buildCrosschainWithdraw2CircuitWitness>[0],
        stateTreeLeaves,
        aspTreeLeaves,
        circuitInputs
      );
      const proofData =
        await withdrawalProofGenerator.generateCrosschainWithdraw2Proof(circuitWitness);
      return { witness, proof: proofData.proof, publicSignals: proofData.publicSignals };
    }

    const circuitWitness = buildWithdraw2CircuitWitness(
      context.derivation as Parameters<typeof buildWithdraw2CircuitWitness>[0],
      stateTreeLeaves,
      aspTreeLeaves,
      circuitInputs
    );
    const proofData = await withdrawalProofGenerator.generateWithdraw2Proof(circuitWitness);
    return { witness, proof: proofData.proof, publicSignals: proofData.publicSignals };
  }
}
