/**
 * @shinobi-cash/client
 *
 * Chain interaction layer for Shinobi Cash.
 * Wraps ShinobiAccount with bundler, indexer, contract reads, and solver.
 *
 * Pattern: ShinobiAccount = encode + prove, ShinobiCashClient = execute + fetch
 */

export type {
  ShinobiCashClientConfig,
  ShinobiCashClient,
  ClientIndexer,
  SolverQuoteRequest,
  SolverQuote,
  PreparedWithdrawalOp,
  PreparedRefundOp,
  ClientWithdrawParams,
  ClientWithdraw2Params,
  ClientWithdrawalRefundParams,
} from "./types.js";
