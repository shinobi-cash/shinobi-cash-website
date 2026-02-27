/**
 * Withdrawal extension — adds same-chain withdrawal operations.
 *
 * Usage: client.extend(withWithdrawal(relayer))
 */

import type { WithdrawalFeeQuote } from "@shinobi-cash/core/fees";
import { createWithdrawalData } from "@shinobi-cash/core/withdrawal";
import type {
  ClientContext,
  ShinobiRelayer,
  RelayOperationType,
  WithdrawalActions,
  ClientWithdrawParams,
  ClientWithdraw2Params,
  PreparedWithdrawalOp,
} from "../types.js";
import { resolveASPProof, resolveASPProofsForWithdraw2 } from "../asp-proof.js";
import { buildFeeQuote } from "./withdrawal-utils.js";

export function withWithdrawal(relayer: ShinobiRelayer) {
  return (ctx: ClientContext): WithdrawalActions => {
    async function resolveWithdrawalContext(
      type: RelayOperationType,
      amountWei: bigint,
      recipient: `0x${string}`,
    ) {
      const [chainCtx, { relayFeeBPS }] = await Promise.all([
        ctx.fetchContext(),
        relayer.quoteRelayFee({ type, amountWei }),
      ]);

      const relayAddress = relayer.getRelayAddress(type);
      const feeQuote = buildFeeQuote(amountWei, relayFeeBPS, 0);
      const withdrawalData = createWithdrawalData(recipient, relayAddress, BigInt(feeQuote.relayFeeBPS));

      return { ...chainCtx, feeQuote, withdrawalData };
    }

    return {
      async quoteWithdrawal(params: { amountWei: bigint }): Promise<WithdrawalFeeQuote> {
        const type: RelayOperationType = "withdraw";
        const { relayFeeBPS } = await relayer.quoteRelayFee({ type, amountWei: params.amountWei });
        return buildFeeQuote(params.amountWei, relayFeeBPS, 0);
      },

      async quoteWithdraw2(params: { amountWei: bigint }): Promise<WithdrawalFeeQuote> {
        const type: RelayOperationType = "withdraw2";
        const { relayFeeBPS } = await relayer.quoteRelayFee({ type, amountWei: params.amountWei });
        return buildFeeQuote(params.amountWei, relayFeeBPS, 0);
      },

      async prepareWithdrawal(params: ClientWithdrawParams): Promise<PreparedWithdrawalOp> {
        const type: RelayOperationType = "withdraw";
        const wctx = await resolveWithdrawalContext(type, params.amountWei, params.recipient);
        const aspProof = await resolveASPProof(wctx.aspRootCid, BigInt(params.note.label), ctx.ipfsGateways);

        const call = await ctx.account.encodeWithdrawal({
          note: params.note,
          poolAddress: ctx.poolAddress,
          poolScope: wctx.poolScope,
          stateCommitments: wctx.stateCommitments,
          aspProof,
          withdrawalData: wctx.withdrawalData,
          amountWei: params.amountWei,
          isCrossChain: false,
        });

        return { kind: "withdrawal", feeQuote: wctx.feeQuote, call, type };
      },

      async prepareWithdraw2(params: ClientWithdraw2Params): Promise<PreparedWithdrawalOp> {
        const type: RelayOperationType = "withdraw2";
        const wctx = await resolveWithdrawalContext(type, params.amountWei, params.recipient);

        const { primary: primaryASPProof, secondary: secondaryASPProof } =
          await resolveASPProofsForWithdraw2(
            wctx.aspRootCid,
            BigInt(params.primaryNote.label),
            BigInt(params.secondaryNote.label),
            ctx.ipfsGateways,
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
          isCrossChain: false,
        });

        return { kind: "withdrawal", feeQuote: wctx.feeQuote, call, type };
      },

      async submitWithdrawal(prepared: PreparedWithdrawalOp): Promise<`0x${string}`> {
        const txId = await relayer.sendTransaction({ call: prepared.call, type: prepared.type });
        const receipt = await relayer.waitForReceipt(txId);
        return receipt.transactionHash;
      },
    };
  };
}
