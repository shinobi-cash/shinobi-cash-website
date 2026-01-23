/**
 * Type Definitions for Shinobi Cash Core SDK
 */

// Hash types
export type { CommitmentHash, NullifierHash, PrecommitmentHash, PoolAddress } from './Hash.js';
export { toHashString, fromHashString } from './Hash.js';

// Note types
export type { Note, DepositNote, ChangeNote, RefundNote, NoteChain, CachedNoteData } from './Note.js';
export { isDepositNote, isChangeNote, isRefundNote } from './Note.js';

// Discovery types
export type {
  DiscoveryResult,
  DiscoveryProgress,
  DiscoveryOptions,
  DiscoveryPolicy,
  DiscoveryState,
  LiveDeposit,
} from './Discovery.js';
export { DEFAULT_DISCOVERY_POLICY } from './Discovery.js';

// Deposit types
export type { DepositCommitmentResult } from './Deposit.js';

// Withdrawal types
export type {
  WithdrawalKind,
  FeeQuote,
  WithdrawalRequest,
  WithdrawalContext,
  CrosschainWithdrawalContext,
  WithdrawalProofData,
  StateTreeLeaf,
  ASPData,
} from './Withdrawal.js';

// Account types
export type { WalletAccountId } from './Account.js';
export {
  assertWalletAccountId,
  parseWalletAccountId,
  getWalletAccountId,
} from './Account.js';
