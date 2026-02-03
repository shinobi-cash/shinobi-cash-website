/**
 * App-Specific Data Type Interfaces
 */

import type { WalletAccountId } from "@shinobi-cash/core/auth";
import type { NoteChain, NullifierInfo } from "@shinobi-cash/core/discovery";

/**
 * Account Metadata - This is stored in IndexedDB account store
 */
export interface AccountMetadata {
  accountId: WalletAccountId; // Technical ID: "0xabc:chain-1" (format: walletAddress:chain-chainId)
  credentialId?: string; // WebAuthn credential ID if passkey is enabled
}

/**
 * Account Data - Runtime representation (includes secrets + derived fields)
 * This is NEVER persisted to storage
 */
export interface AccountData extends AccountMetadata {
  privateKey: string; // AMK - in memory only (from wrapped-amk store)
  publicKey: string; // Derived from privateKey at runtime
}

/**
 * Cached note data stored locally with discovery metadata
 */
export interface CachedNoteData {
  poolAddress: string;
  publicKey: string;
  notes: NoteChain[];
  lastUsedDepositIndex: number;
  lastSyncTime: number;
  lastProcessedOffset?: number;
  // Full discovery state for proper resumption
  nullifierMap?: Array<{ hash: string; info: NullifierInfo }>;
  nextDepositIndex?: number;
  newDepositsFound?: number;
}

export interface EncryptedNotesData {
  id: string;
  encryptedPayload: {
    iv: string;
    data: string;
    salt: string;
  };
  lastSyncTime: number;
}

// Session types - from keyDerivation.ts
export interface SessionInfo {
  accountId: WalletAccountId;
  lastAuthTime: number;
  environment: "iframe" | "native";
  credentialId?: string; // Only for passkey auth
}

// Wrapped AMK (Account Master Key) storage
// Envelope encryption: AMK is encrypted with each KEK separately
// This allows multiple auth methods to unlock the same AMK
export interface WrappedAMK {
  id: string; // Storage key: "accountId:amk:wallet" or "accountId:amk:passkey"
  accountId: WalletAccountId; // Wallet account ID
  wrappedBy: "wallet" | "passkey"; // Which KEK encrypted this
  encryptedPrivateKey: string; // AMK encrypted with KEK
  iv: string; // Initialization vector
  salt: string; // Salt used for encryption
  createdAt: number;
}
