/**
 * createShinobiCashClient — Chain interaction layer factory.
 *
 * Pattern: ShinobiAccount = encode + prove, ShinobiCashClient = execute + fetch.
 * Wraps ShinobiAccount with bundler (Pimlico), indexer data, contract reads,
 * and solver quotes.
 */

import type { PreparedWithdrawal, PreparedWithdrawalRefund } from "@shinobi-cash/core/account";
import type { GasLimits, WithdrawalFeeQuote } from "@shinobi-cash/core/fees";
import { quoteWithdrawalFees, quoteWithdraw2Fees } from "@shinobi-cash/core/fees";
import {
  NoteDiscovery,
  getSpendableNotes as coreGetSpendableNotes,
  type NoteTree,
  type DiscoveryResult,
  type DiscoveryOptions,
  type SpendableNote,
  type ActivityItem,
} from "@shinobi-cash/core/discovery";
import { isSpendableNote } from "@shinobi-cash/core/discovery";
import type { UserOperation } from "viem/account-abstraction";
import type { SmartAccountClient } from "permissionless";
import type {
  ShinobiCashClientConfig,
  ShinobiCashClient,
  ClientWithdrawParams,
  ClientWithdraw2Params,
  ClientWithdrawalRefundParams,
  PreparedWithdrawalOp,
  PreparedRefundOp,
  SolverQuoteRequest,
  SolverQuote,
} from "./types.js";
import { createPimlicoInstance, createSmartAccountForWithdrawal } from "./bundler.js";
import { prepareUserOp, executeUserOp } from "./user-operation.js";
import { fetchPoolScope as fetchPoolScopeFromContract } from "./contract-reads.js";
import { fetchSolverQuote } from "./solver.js";

/** Internal data stored in opaque PreparedWithdrawalOp / PreparedRefundOp */
interface InternalOpData {
  prepared: PreparedWithdrawal | PreparedWithdrawalRefund;
  userOp: UserOperation<"0.7">;
  gasLimits: GasLimits;
}

function getInternal(op: PreparedWithdrawalOp | PreparedRefundOp): InternalOpData {
  return op._internal as InternalOpData;
}

const NO_OP_PERSISTENCE = {
  loadState: async () => null,
  saveState: async () => {},
};

export function createShinobiCashClient(config: ShinobiCashClientConfig): ShinobiCashClient {
  const { account, poolAddress, indexer, bundlerUrl, rpcUrl, solverUrl, persistence = NO_OP_PERSISTENCE } = config;
  const pimlico = createPimlicoInstance(bundlerUrl);

  // Discovery state
  let trees: NoteTree[] = [];
  let lastUsedIndexByChain = new Map<string, number>();
  let activities: ActivityItem[] = [];

  const discovery = new NoteDiscovery(indexer.getActivities, persistence);

  async function fetchContext() {
    const [poolScope, stateTree, aspLabels, gasPrices] = await Promise.all([
      fetchPoolScopeFromContract(rpcUrl),
      indexer.getStateTree(poolAddress),
      indexer.getApprovedLabels(),
      pimlico.getUserOperationGasPrice(),
    ]);

    return {
      poolScope,
      stateCommitments: stateTree.leaves.map((l) => BigInt(l.commitment)),
      aspLabels: aspLabels.map((l) => BigInt(l)),
      gasPriceWei: gasPrices.fast.maxFeePerGas,
    };
  }

  async function buildWithdrawalOp(prepared: PreparedWithdrawal): Promise<PreparedWithdrawalOp> {
    const { smartAccountClient, gasLimits } = await createSmartAccountForWithdrawal(
      bundlerUrl,
      prepared.paymasterAddress,
      prepared.gasLimits
    );

    const userOp = await prepareUserOp(
      smartAccountClient,
      pimlico,
      prepared.callData,
      prepared.gasLimits,
      prepared.to
    );

    return {
      kind: "withdrawal",
      feeQuote: prepared.feeQuote,
      _internal: { prepared, userOp, gasLimits } satisfies InternalOpData,
    };
  }

  async function buildRefundOp(prepared: PreparedWithdrawalRefund): Promise<PreparedRefundOp> {
    const { smartAccountClient, gasLimits } = await createSmartAccountForWithdrawal(
      bundlerUrl,
      prepared.paymasterAddress,
      prepared.gasLimits
    );

    const userOp = await prepareUserOp(
      smartAccountClient,
      pimlico,
      prepared.callData,
      prepared.gasLimits,
      prepared.to
    );

    return {
      kind: "refund",
      _internal: { prepared, userOp, gasLimits } satisfies InternalOpData,
    };
  }

  return {
    get account() {
      return account;
    },

    get accountId() {
      return account.accountId;
    },

    // Discovery
    async sync(options?: DiscoveryOptions): Promise<DiscoveryResult> {
      const result = await discovery.sync(account.accountId, poolAddress, account, options);
      trees = result.trees;
      lastUsedIndexByChain = result.lastUsedIndexByChain;
      activities = result.activities;
      return result;
    },

    getSpendableNotes(): SpendableNote[] {
      return coreGetSpendableNotes(trees).filter(isSpendableNote);
    },

    getBalance(): bigint {
      return this.getSpendableNotes().reduce((sum, note) => sum + BigInt(note.amount), BigInt(0));
    },

    getNextDepositIndex(chainId: number): number {
      const lastUsed = lastUsedIndexByChain.get(chainId.toString()) ?? -1;
      return lastUsed + 1;
    },

    getActivities(): ActivityItem[] {
      return activities;
    },

    async prepareWithdrawal(params: ClientWithdrawParams): Promise<PreparedWithdrawalOp> {
      const ctx = await fetchContext();

      const prepared = await account.prepareWithdrawal({
        poolAddress,
        note: params.note,
        amountWei: params.amountWei,
        recipient: params.recipient,
        destinationChainId: params.destinationChainId,
        gasPriceWei: ctx.gasPriceWei,
        poolScope: ctx.poolScope,
        stateCommitments: ctx.stateCommitments,
        aspLabels: ctx.aspLabels,
      });

      return buildWithdrawalOp(prepared);
    },

    async prepareWithdraw2(params: ClientWithdraw2Params): Promise<PreparedWithdrawalOp> {
      const ctx = await fetchContext();

      const prepared = await account.prepareWithdraw2({
        poolAddress,
        primaryNote: params.primaryNote,
        secondaryNote: params.secondaryNote,
        amountWei: params.amountWei,
        recipient: params.recipient,
        destinationChainId: params.destinationChainId,
        gasPriceWei: ctx.gasPriceWei,
        poolScope: ctx.poolScope,
        stateCommitments: ctx.stateCommitments,
        aspLabels: ctx.aspLabels,
        labelSelector: params.labelSelector,
      });

      return buildWithdrawalOp(prepared);
    },

    async submitWithdrawal(op: PreparedWithdrawalOp | PreparedRefundOp): Promise<string> {
      const internal = getInternal(op);

      const { smartAccountClient } = await createSmartAccountForWithdrawal(
        bundlerUrl,
        internal.prepared.paymasterAddress,
        internal.prepared.gasLimits
      );

      return executeUserOp(smartAccountClient, internal.userOp, internal.gasLimits);
    },

    async prepareWithdrawalRefund(params: ClientWithdrawalRefundParams): Promise<PreparedRefundOp> {
      const prepared = account.prepareWithdrawalRefund({
        rawIntent: params.rawIntent,
        settlerAddress: params.settlerAddress,
      });

      return buildRefundOp(prepared);
    },

    async quoteWithdrawal(params: { amountWei: bigint; destinationChainId?: number }): Promise<WithdrawalFeeQuote> {
      const gasPrices = await pimlico.getUserOperationGasPrice();
      return quoteWithdrawalFees({
        amountWei: params.amountWei,
        destinationChainId: params.destinationChainId,
        gasPriceWei: gasPrices.fast.maxFeePerGas,
      });
    },

    async quoteWithdraw2(params: { amountWei: bigint; destinationChainId?: number }): Promise<WithdrawalFeeQuote> {
      const gasPrices = await pimlico.getUserOperationGasPrice();
      return quoteWithdraw2Fees({
        amountWei: params.amountWei,
        destinationChainId: params.destinationChainId,
        gasPriceWei: gasPrices.fast.maxFeePerGas,
      });
    },

    async fetchPoolScope(): Promise<bigint> {
      return fetchPoolScopeFromContract(rpcUrl);
    },

    async getSolverQuote(params: SolverQuoteRequest): Promise<SolverQuote> {
      if (!solverUrl) {
        throw new Error("Solver URL not configured — cross-chain operations unavailable");
      }
      return fetchSolverQuote(solverUrl, params);
    },

    isCrossChainEnabled(): boolean {
      return !!solverUrl;
    },

    async getBundlerGasPrice(): Promise<bigint> {
      const gasPrices = await pimlico.getUserOperationGasPrice();
      return gasPrices.fast.maxFeePerGas;
    },
  };
}
