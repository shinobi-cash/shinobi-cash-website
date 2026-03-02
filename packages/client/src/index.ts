/**
 * @shinobi-cash/client
 *
 * Chain interaction layer for Shinobi Cash.
 * Base client handles discovery and chain utilities.
 * Extend with action extensions for deposits, withdrawals, etc.
 *
 * Usage:
 *   createShinobiCashClient({ account, indexer })
 *     .extend(withDeposit())
 *     .extend(withCrosschainDeposit(solver))
 *     .extend(withWithdrawal(relayer))
 *     .extend(withCrosschainWithdrawal(relayer, solver))
 */

export type {
  ShinobiCashClientConfig,
  BaseShinobiCashClient,
  ShinobiCashClient,
  ShinobiIndexer,
  ShinobiRelayer,
  RelayOperationType,
  ShinobiSolver,
  SolverQuoteRequest,
  SolverQuote,
  DepositActions,
  CrosschainDepositActions,
  WithdrawalActions,
  CrosschainWithdrawalActions,
  PreparedWithdrawalOp,
  ClientDepositParams,
  ClientCrosschainDepositParams,
  ClientWithdrawParams,
  ClientWithdraw2Params,
  ClientCrosschainWithdrawParams,
  ClientCrosschainWithdraw2Params,
  ClientRagequitParams,
  ClientDepositRefundParams,
  ClientWithdrawalRefundParams,
} from "./types.js";

// Runtime exports
export { createShinobiCashClient } from "./client.js";
export { withDeposit } from "./actions/deposit.js";
export { withCrosschainDeposit } from "./actions/crosschain-deposit.js";
export { withWithdrawal } from "./actions/withdrawal.js";
export { withCrosschainWithdrawal } from "./actions/crosschain-withdrawal.js";

// Re-export storage types used in client config
export type { StorageLayer, SerializableDiscoveryState } from "@shinobi-cash/core/discovery";
