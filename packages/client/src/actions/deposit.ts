/**
 * Deposit extension — adds same-chain deposit and ragequit operations.
 *
 * Usage: client.extend(withDeposit())
 */

import type { Call } from "@shinobi-cash/core/account";
import type { DepositFeeQuote } from "@shinobi-cash/core/fees";
import { quoteDepositFees } from "@shinobi-cash/core/fees";
import { POOL_CHAIN } from "@shinobi-cash/constants";
import type { WalletClient } from "viem";
import type {
  ClientContext,
  DepositActions,
  ClientDepositParams,
  ClientRagequitParams,
} from "../types.js";

export function withDeposit() {
  return (ctx: ClientContext): DepositActions => ({
    quoteDeposit(params: { amountWei: bigint }): DepositFeeQuote {
      return quoteDepositFees({ amountWei: params.amountWei, isCrossChain: false });
    },

    prepareDeposit(params: ClientDepositParams): Call {
      const depositIndex = ctx.getNextDepositIndex(POOL_CHAIN.id);
      return ctx.account.encodeDeposit({
        poolAddress: ctx.poolAddress,
        amountWei: params.amountWei,
        depositIndex,
      });
    },

    async deposit(call: Call, walletClient: WalletClient): Promise<`0x${string}`> {
      return walletClient.sendTransaction({
        account: walletClient.account!,
        chain: walletClient.chain,
        to: call.to,
        data: call.data,
        value: call.value,
      });
    },

    async prepareRagequit(params: ClientRagequitParams): Promise<Call> {
      return ctx.account.encodeRagequit({ note: params.note, poolAddress: ctx.poolAddress });
    },

    async ragequit(call: Call, walletClient: WalletClient): Promise<`0x${string}`> {
      return walletClient.sendTransaction({
        account: walletClient.account!,
        chain: walletClient.chain,
        to: call.to,
        data: call.data,
        value: call.value,
      });
    },
  });
}
