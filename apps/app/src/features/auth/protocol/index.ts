/**
 * Auth Protocol - Public Exports
 * Pure functions for authentication operations
 *
 * SECURITY: All wallet signature operations use HKDF for secure key derivation
 * @file features/auth/protocol/index.ts
 */

// Account ID utilities
export { getWalletAccountId } from "./accountId";

// Passkey operations
export { performPasskeyLogin, performPasskeySetup, hasPasskey } from "./passkeyOperations";

// Wallet operations (SECURE - uses HKDF)
export {
  performWalletLogin,
  setupWalletAccount,
  setupWalletAccountWithDerivedKey,
  deriveKeyGenSeed,
  deriveEncryptionKey,
} from "./walletOperations";

// Key generation (SECURE - uses HKDF)
export { generateKeysFromSeed, generateKeysFromWalletSignature } from "./keyGeneration";

// Cryptographic utilities
export { deriveKeysFromSignature } from "./crypto";

// Session management
export type { SessionResumeResult } from "./sessionManagement";
export {
  checkSessionResume,
  resumeWithPassword,
  resumeWithPasskey,
  clearSession,
  storeSession,
  listAccounts,
  hasAccounts,
  accountExists,
} from "./sessionManagement";
