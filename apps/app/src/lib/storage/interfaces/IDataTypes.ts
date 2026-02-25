/**
 * App-Specific Data Type Interfaces
 */

import type { WalletAccountId } from "@/lib/auth";
import type {
  SerializableNoteNode,
  NullifierInfo,
  ActivityItem,
} from "@shinobi-cash/core/discovery";

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
  privateKey: string; // Master Key - in memory only (from wrapped-master-key store)
  publicKey: string; // Derived from privateKey at runtime
}

/**
 * Cached note data stored locally with discovery metadata.
 * NullifierInfo includes originChainId for proper chain identification.
 */
export interface CachedNoteData {
  poolAddress: string;
  accountId: string;
  trees: SerializableNoteNode[];
  lastSyncTime: number;
  minOffset?: number;
  /** Full discovery state for proper resumption. NullifierInfo includes originChainId. */
  nullifierMap?: Array<{ hash: string; info: NullifierInfo }>;
  /** Next deposit index per chain (keyed by chainId string) */
  nextDepositIndex?: Array<{ chainId: string; index: number }>;
  /** Raw activities for display (data-v2 activities are already string-based) */
  activities?: ActivityItem[];
}

export interface EncryptedNotesData {
  id: string;
  encryptedPayload: {
    iv: string;
    data: string;
  };
  lastSyncTime: number;
}

// Session types
// No timeout needed — sessionStorage is tab-scoped (cleared on tab close)
export interface SessionInfo {
  accountId: WalletAccountId;
  environment: "iframe" | "native";
  credentialId?: string; // Only for passkey auth
}

// Wrapped Master Key (MK) storage
// Envelope encryption: MK is encrypted with each KEK separately
// This allows multiple auth methods to unlock the same Master Key
export interface WrappedMasterKey {
  id: string; // Storage key: "accountId:mk:wallet" or "accountId:mk:passkey"
  accountId: WalletAccountId; // Wallet account ID
  wrappedBy: "wallet" | "passkey"; // Which KEK encrypted this
  encryptedPrivateKey: string; // Master Key encrypted with KEK
  iv: string; // Initialization vector
  createdAt: number;
}
