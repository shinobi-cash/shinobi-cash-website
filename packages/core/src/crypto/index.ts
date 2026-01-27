/**
 * Cryptographic Utilities
 */

// Note derivation
export {
  parseUserKey,
  deriveDepositNullifier,
  deriveDepositSecret,
  deriveChangeNullifier,
  deriveChangeSecret,
  deriveRefundNullifier,
  deriveRefundSecret,
  derivePrecommitment,
  derivedNoteCommitment,
} from './noteDerivation.js';

// Key generation
export {
  generateKeysFromRandomSeed,
  deriveKeysFromSignature,
  generateKeysFromWalletSignature,
  type KeyGenerationResult,
} from './keyGeneration.js';

// Note discovery
export {
  buildActivityIndexMaps,
  buildNoteChain,
  extendNoteChain,
  type ActivityContext,
} from './noteDiscovery.js';

// Withdrawal derivation
export {
  deriveWithdrawalInputs,
  deriveCrosschainWithdrawalInputs,
  deriveRefundCommitment,
  calculateContextHash,
  hashToBigInt,
  SNARK_SCALAR_FIELD,
  type WithdrawalDerivation,
  type CrosschainWithdrawalDerivation,
  type ContextHash,
} from './withdrawalDerivation.js';

// Domain errors
export {
  WithdrawalError,
  InvalidWithdrawalNoteError,
  CommitmentNotFoundError,
  LabelNotApprovedError,
  ProofGenerationError,
  ProofVerificationError,
} from './errors.js';
