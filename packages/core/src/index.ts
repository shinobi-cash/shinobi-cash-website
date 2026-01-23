/**
 * Shinobi Cash Core SDK
 *
 * Framework-agnostic SDK for privacy pool operations including:
 * - Cryptographic primitives (note derivation, commitments)
 * - Note discovery and management
 * - Zero-knowledge proof generation
 * - Deposit and withdrawal flows
 *
 * ## API Design Philosophy
 *
 * ### Functions vs Classes
 *
 * Core exports are primarily **pure functions** with two intentional exceptions:
 *
 * **Use Pure Functions (default):**
 * - Crypto operations: `deriveDepositNullifier()`, `poseidon2()`
 * - State transitions: `applyActivityPage()`, `extendNoteChain()`
 * - Derivations: `parseUserKey()`, `derivePrecommitment()`
 *
 * **Use Classes (only when necessary):**
 * - `WithdrawalProofGenerator` - Caches expensive circuit loading
 * - `EncryptionService` - Manages crypto keys and session state
 *
 * **Rule:** Classes are ONLY used when:
 * 1. Expensive state caching is required (circuits, keys)
 * 2. External resources need lifecycle management
 *
 * Everything else is a pure function for:
 * - Easier testing (no mocks)
 * - Clear data flow
 * - Tree-shaking optimization
 * - Predictable behavior
 *
 * ### Hash Representation
 *
 * All hashes use **decimal string format** (BigInt.toString()):
 * - ✅ "12345678901234567890"
 * - ❌ "0x123abc..." (no hex)
 *
 * This matches Poseidon hash outputs and enables consistent comparisons.
 *
 * ### Development Utilities
 *
 * Dev-only helpers (logging, assertions) are centralized in the `dev` namespace
 * and are zero-cost in production builds.
 */

// ============================================
// TYPES
// ============================================

export type {
  // Hash types
  CommitmentHash,
  NullifierHash,
  PrecommitmentHash,
  PoolAddress,
  // Note types
  Note,
  DepositNote,
  ChangeNote,
  RefundNote,
  NoteChain,
  CachedNoteData,
  // Discovery types
  DiscoveryResult,
  DiscoveryProgress,
  DiscoveryOptions,
  DiscoveryPolicy,
  DiscoveryState,
  LiveDeposit,
  // Deposit types
  DepositCommitmentResult,
  // Withdrawal types
  WithdrawalKind,
  FeeQuote,
  WithdrawalRequest,
  WithdrawalContext,
  CrosschainWithdrawalContext,
  StateTreeLeaf,
  ASPData,
  // Account types
  WalletAccountId,
} from './types/index.js';

export {
  toHashString,
  fromHashString,
  isDepositNote,
  isChangeNote,
  isRefundNote,
  DEFAULT_DISCOVERY_POLICY,
  // Account utilities
  assertWalletAccountId,
  parseWalletAccountId,
  getWalletAccountId,
} from './types/index.js';

// ============================================
// CRYPTOGRAPHY
// ============================================

export {
  // Note derivation
  parseUserKey,
  deriveDepositNullifier,
  deriveDepositSecret,
  deriveChangeNullifier,
  deriveChangeSecret,
  deriveRefundNullifier,
  deriveRefundSecret,
  derivePrecommitment,
  derivedNoteCommitment,
  // Key generation
  generateKeysFromRandomSeed,
  deriveKeysFromSignature,
  generateKeysFromWalletSignature,
  // Note discovery primitives
  buildActivityIndexMaps,
  buildNoteChain,
  extendNoteChain,
  // Withdrawal derivation primitives
  deriveWithdrawalInputs,
  deriveCrosschainWithdrawalInputs,
  deriveRefundCommitment,
  calculateContextHash,
  hashToBigInt,
  SNARK_SCALAR_FIELD,
  // Domain errors
  WithdrawalError,
  InvalidWithdrawalNoteError,
  CommitmentNotFoundError,
  LabelNotApprovedError,
  ProofGenerationError,
  ProofVerificationError,
  // Types
  type KeyGenerationResult,
  type ActivityContext,
  type WithdrawalDerivation,
  type CrosschainWithdrawalDerivation,
  type ContextHash,
} from './crypto/index.js';

// ============================================
// AUTHENTICATION
// ============================================

export {
  getShinobiAuthMessage,
  type EIP712MessageOptions,
  type EIP712TypedData,
} from './utils/auth.js';

// ============================================
// ZERO-KNOWLEDGE PROOFS
// ============================================

export {
  WithdrawalProofGenerator,
  withdrawalProofGenerator,
  type CircuitFiles,
  type CircuitFileLoader,
  type WithdrawalProofData,
} from './zk/index.js';

// ============================================
// SERVICES
// ============================================

export {
  // Discovery state management
  initializeDiscoveryState,
  applyActivityPage,
  reconcileExistingDeposits,
  NoteSyncEngine,
  type ActivityPage,
  type ActivityFetcher,
  type PersistenceCallbacks,
  // Withdrawal circuit witness
  buildWithdrawalTrees,
  buildWithdrawalCircuitWitness,
  buildCrosschainWithdrawalCircuitWitness,
  type WithdrawalTrees,
  type WithdrawalIntent,
  type WithdrawalCircuitWitness,
  type CrosschainWithdrawalCircuitWitness,
} from './services/index.js';

// ============================================
// ENCRYPTION & KEY DERIVATION
// ============================================

export {
  EncryptionService,
  type EncryptedData,
} from './encryption/index.js';

// ============================================
// UTILITIES
// ============================================

export { dev } from './utils/dev.js';

// Withdrawal utilities
export {
  classifyWithdrawal,
  calculateFeesFromBPS,
  calculateTotalGas,
  calculateRelayFeeBPS,
  calculateSolverFeeBPS,
  type GasLimits,
  type FeeBreakdown,
} from './utils/withdrawal.js';
