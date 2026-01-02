/**
 * App-Specific Data Type Interfaces
 *
 * Note: Core types (Note, NoteChain, CachedNoteData, DiscoveryResult, EncryptedData)
 * should be imported from @shinobi-cash/core directly
 */

// Passkey unlock metadata (device-scoped convenience unlock)
export interface PasskeyUnlock {
  enabled: boolean;
  credentialId: string;
  deviceName: string; // "MacBook Pro", "iPhone", etc.
  createdAt: number;
}

// Account data - wallet is the ONLY account type
// Passkey is just an optional unlock method, not a separate account
export type CachedAccountData = WalletAccountData;

// Wallet account (the ONLY identity)
export interface WalletAccountData {
  type: "wallet";
  accountId: string; // Technical ID: "0xabc-1" (format: walletAddress-chainId)
  displayName: string; // User-friendly: "Account 1"
  walletAddress: string; // External wallet address (MetaMask, etc.)
  chainId: number; // 1, 137, etc.
  privateKey: string; // Stored (source of truth)
  publicKey: string; // Derived from privateKey (not persisted)
  address: string; // Derived from publicKey (not persisted)
  createdAt: number;

  // NEW: Optional passkey unlock for this wallet
  passkeyUnlock?: PasskeyUnlock;
}

// DEPRECATED: Passkey accounts no longer exist
// Passkey is now a property of wallet accounts (passkeyUnlock)
// This interface is kept for reference only
export interface PasskeyAccountData {
  type: "passkey";
  accountName: string;
  displayName: string;
  privateKey: string;
  publicKey: string;
  address: string;
  createdAt: number;
}

export interface NamedPasskeyData {
  accountName: string;
  credentialId: string;
  publicKeyHash: string;
  created: number;
}

export interface StoredEncryptedData {
  id: string;
  publicKeyHash: string;
  poolAddressHash: string;
  encryptedPayload: {
    iv: string;
    data: string;
    salt: string;
  };
  lastSyncTime: number;
}

// Session types - from keyDerivation.ts
export interface SessionInfo {
  accountName: string;
  authMethod: "passkey" | "wallet";
  lastAuthTime: number;
  environment: "iframe" | "native";
  credentialId?: string; // Only for passkey auth
}

// Wrapped AMK (Account Master Key) storage
// Envelope encryption: AMK is encrypted with each KEK separately
// This allows multiple auth methods to unlock the same AMK
export interface WrappedAMK {
  id: string; // Storage key: "accountId:amk:wallet" or "accountId:amk:passkey"
  accountId: string; // Wallet account ID
  wrappedBy: "wallet" | "passkey"; // Which KEK encrypted this
  encryptedPrivateKey: string; // AMK encrypted with KEK
  iv: string; // Initialization vector
  salt: string; // Salt used for encryption
  createdAt: number;
}
