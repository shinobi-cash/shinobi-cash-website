/**
 * App-Specific Data Type Interfaces
 *
 * Note: Core types (Note, NoteChain, CachedNoteData, DiscoveryResult, EncryptedData)
 * should be imported from @shinobi-cash/core directly
 */

// Account data discriminated by type for type-safe handling
export type CachedAccountData = PasskeyAccountData | WalletAccountData;

// Passkey account with human-readable name
export interface PasskeyAccountData {
  type: "passkey";
  accountName: string; // User-chosen name (e.g., "my-wallet")
  displayName: string; // Same as accountName for passkeys
  privateKey: string; // Stored (source of truth)
  publicKey: string; // Derived from privateKey (not persisted)
  address: string; // Derived from publicKey (not persisted)
  createdAt: number;
}

// Wallet-only account identified by address + chain
export interface WalletAccountData {
  type: "wallet";
  accountId: string; // Technical ID: "0xabc:chain-1"
  displayName: string; // User-friendly: "Account 1"
  walletAddress: string; // External wallet address (MetaMask, etc.)
  chainId: number; // 1, 137, etc.
  privateKey: string; // Stored (source of truth)
  publicKey: string; // Derived from privateKey (not persisted)
  address: string; // Derived from publicKey (not persisted)
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
