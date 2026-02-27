/**
 * Crosschain deposit extension — adds cross-chain deposit, deposit refund, and solver quote.
 *
 * Usage: client.extend(withCrosschainDeposit(solver))
 */

import type { Call } from "@shinobi-cash/core/account";
import type { DepositFeeQuote } from "@shinobi-cash/core/fees";
import { quoteDepositFees } from "@shinobi-cash/core/fees";
import type { WalletClient } from "viem";
import type {
  ClientContext,
  ShinobiSolver,
  CrosschainDepositActions,
  ClientCrosschainDepositParams,
  ClientDepositRefundParams,
  SolverQuoteRequest,
  SolverQuote,
} from "../types.js";

export function withCrosschainDeposit(solver: ShinobiSolver) {
  return (ctx: ClientContext): CrosschainDepositActions => ({
    quoteCrosschainDeposit(params: { amountWei: bigint; solverFeeBPS?: number }): DepositFeeQuote {
      return quoteDepositFees({ amountWei: params.amountWei, isCrossChain: true, solverFeeBPS: params.solverFeeBPS });
    },

    prepareCrosschainDeposit(params: ClientCrosschainDepositParams): Call {
      const depositIndex = ctx.getNextDepositIndex(params.chainId);
      return ctx.account.encodeCrosschainDeposit({
        poolAddress: ctx.poolAddress,
        amountWei: params.amountWei,
        chainId: params.chainId,
        depositIndex,
        settings: params.settings,
        useDefaults: params.useDefaults,
      });
    },

    prepareDepositRefund(params: ClientDepositRefundParams): Call {
      return ctx.account.encodeRefund({
        rawIntent: params.rawIntent,
        settlerAddress: params.settlerAddress,
      });
    },

    async depositRefund(call: Call, walletClient: WalletClient): Promise<`0x${string}`> {
      return walletClient.sendTransaction({ account: walletClient.account!, chain: walletClient.chain, to: call.to, data: call.data, value: call.value });
    },

    async getSolverQuote(params: SolverQuoteRequest): Promise<SolverQuote> {
      return solver.getQuote(params);
    },
  });
}
