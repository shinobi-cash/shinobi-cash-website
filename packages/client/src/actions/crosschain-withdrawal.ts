/**
 * Crosschain withdrawal extension — adds cross-chain withdrawal, withdrawal refund, and solver quote.
 *
 * Usage: client.extend(withCrosschainWithdrawal(relayer, solver))
 */

import type { Call } from "@shinobi-cash/core/account";
import type { WithdrawalFeeQuote } from "@shinobi-cash/core/fees";
import { calculateSolverFeeBPS } from "@shinobi-cash/core/fees";
import { createCrossChainWithdrawalData } from "@shinobi-cash/core/withdrawal";
import type {
  ClientContext,
  ShinobiRelayer,
  ShinobiSolver,
  RelayOperationType,
  CrosschainWithdrawalActions,
  ClientCrosschainWithdrawParams,
  ClientCrosschainWithdraw2Params,
  ClientWithdrawalRefundParams,
  PreparedWithdrawalOp,
  SolverQuoteRequest,
  SolverQuote,
} from "../types.js";
import { resolveASPProof, resolveASPProofsForWithdraw2 } from "../asp-proof.js";
import { buildFeeQuote } from "./withdrawal-utils.js";

export function withCrosschainWithdrawal(relayer: ShinobiRelayer, solver: ShinobiSolver) {
  return (ctx: ClientContext): CrosschainWithdrawalActions => {
    const solverFeeBPS = calculateSolverFeeBPS("cross-chain");

    async function resolveWithdrawalContext(
      type: RelayOperationType,
      amountWei: bigint,
      recipient: `0x${string}`,
      destinationChainId: number
    ) {
      const [chainCtx, { relayFeeBPS }] = await Promise.all([
        ctx.fetchContext(),
        relayer.quoteRelayFee({ type, amountWei }),
      ]);

      const relayAddress = relayer.getRelayAddress(type);
      const feeQuote = buildFeeQuote(amountWei, relayFeeBPS, solverFeeBPS);
      const withdrawalData = createCrossChainWithdrawalData(
        recipient,
        destinationChainId,
        relayAddress,
        BigInt(feeQuote.solverFeeBPS)
      );

      return { ...chainCtx, relayAddress, feeQuote, withdrawalData };
    }

    return {
      async quoteCrosschainWithdrawal(params: {
        amountWei: bigint;
        destinationChainId: number;
      }): Promise<WithdrawalFeeQuote> {
        const type: RelayOperationType = "withdraw-crosschain";
        const { relayFeeBPS } = await relayer.quoteRelayFee({ type, amountWei: params.amountWei });
        return buildFeeQuote(params.amountWei, relayFeeBPS, solverFeeBPS);
      },

      async quoteCrosschainWithdraw2(params: {
        amountWei: bigint;
        destinationChainId: number;
      }): Promise<WithdrawalFeeQuote> {
        const type: RelayOperationType = "withdraw2-crosschain";
        const { relayFeeBPS } = await relayer.quoteRelayFee({ type, amountWei: params.amountWei });
        return buildFeeQuote(params.amountWei, relayFeeBPS, solverFeeBPS);
      },

      async prepareCrosschainWithdrawal(
        params: ClientCrosschainWithdrawParams
      ): Promise<PreparedWithdrawalOp> {
        const type: RelayOperationType = "withdraw-crosschain";
        const wctx = await resolveWithdrawalContext(
          type,
          params.amountWei,
          params.recipient,
          params.destinationChainId
        );
        const aspProof = await resolveASPProof(
          wctx.aspRootCid,
          BigInt(params.note.label),
          ctx.ipfsGateways
        );

        const call = await ctx.account.encodeWithdrawal({
          note: params.note,
          poolAddress: ctx.poolAddress,
          poolScope: wctx.poolScope,
          stateCommitments: wctx.stateCommitments,
          aspProof,
          withdrawalData: wctx.withdrawalData,
          amountWei: params.amountWei,
          isCrossChain: true,
          relayFeeBPS: BigInt(wctx.feeQuote.relayFeeBPS),
          refundFeeBPS: BigInt(wctx.feeQuote.relayFeeBPS),
        });

        return { kind: "withdrawal", feeQuote: wctx.feeQuote, call, type };
      },

      async prepareCrosschainWithdraw2(
        params: ClientCrosschainWithdraw2Params
      ): Promise<PreparedWithdrawalOp> {
        const type: RelayOperationType = "withdraw2-crosschain";
        const wctx = await resolveWithdrawalContext(
          type,
          params.amountWei,
          params.recipient,
          params.destinationChainId
        );

        const { primary: primaryASPProof, secondary: secondaryASPProof } =
          await resolveASPProofsForWithdraw2(
            wctx.aspRootCid,
            BigInt(params.primaryNote.label),
            BigInt(params.secondaryNote.label),
            ctx.ipfsGateways
          );

        const call = await ctx.account.encodeWithdraw2({
          primaryNote: params.primaryNote,
          secondaryNote: params.secondaryNote,
          poolAddress: ctx.poolAddress,
          poolScope: wctx.poolScope,
          stateCommitments: wctx.stateCommitments,
          primaryASPProof,
          secondaryASPProof,
          withdrawalData: wctx.withdrawalData,
          amountWei: params.amountWei,
          labelSelector: params.labelSelector,
          isCrossChain: true,
          relayFeeBPS: BigInt(wctx.feeQuote.relayFeeBPS),
          refundFeeBPS: BigInt(wctx.feeQuote.relayFeeBPS),
        });

        return { kind: "withdrawal", feeQuote: wctx.feeQuote, call, type };
      },

      async submitWithdrawal(prepared: PreparedWithdrawalOp): Promise<`0x${string}`> {
        const txId = await relayer.sendTransaction({ call: prepared.call, type: prepared.type });
        const receipt = await relayer.waitForReceipt(txId);
        return receipt.transactionHash;
      },

      prepareWithdrawalRefund(params: ClientWithdrawalRefundParams): Call {
        return ctx.account.encodeRefund({
          rawIntent: params.rawIntent,
          settlerAddress: params.settlerAddress,
        });
      },

      async submitWithdrawalRefund(call: Call): Promise<`0x${string}`> {
        const txId = await relayer.sendTransaction({ call, type: "refund" });
        const receipt = await relayer.waitForReceipt(txId);
        return receipt.transactionHash;
      },

      async getSolverQuote(params: SolverQuoteRequest): Promise<SolverQuote> {
        return solver.getQuote(params);
      },
    };
  };
}
