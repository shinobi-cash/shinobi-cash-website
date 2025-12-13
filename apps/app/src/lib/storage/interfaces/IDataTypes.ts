/**
 * Data Type Interfaces - Exact matches to current implementation
 * These maintain 100% compatibility with existing data structures
 */

// Re-export from current implementation to maintain compatibility
export interface Note {
  poolAddress: string;
  depositIndex: number;
  changeIndex: number;
  refundIndex?: number; // For refund notes created from failed cross-chain withdrawals
  noteType: "deposit" | "change" | "refund"; // Type of note
  amount: string;
  originTransactionHash: string; // Transaction on origin chain
  destinationTransactionHash: string; // Transaction on destination chain (same as origin for same-chain)
  originChainId: string; // Origin chain ID
  destinationChainId: string; // Destination chain ID (same as origin for same-chain)
  blockNumber: string;
  timestamp: string;
  status: "unspent" | "spent";
  isActivated: boolean; // false for pending deposits (no label yet), true when deposited in pool
  label: string;
  refundCommitment?: string; // For withdrawal change notes - used if withdrawal intent fails
}

export type NoteChain = Note[];

export interface CachedNoteData {
  poolAddress: string;
  publicKey: string;
  notes: NoteChain[];
  lastUsedDepositIndex: number;
  lastSyncTime: number;
  lastProcessedCursor?: string;
}

export interface CachedAccountData {
  accountName: string;
  mnemonic: string[];
  createdAt: number;
}

export interface NamedPasskeyData {
  accountName: string;
  credentialId: string;
  publicKeyHash: string;
  created: number;
}

export interface DiscoveryResult {
  notes: NoteChain[];
  lastUsedIndex: number;
  newNotesFound: number;
  lastProcessedCursor?: string;
}

// Internal encryption types - exact match to current implementation
export interface EncryptedData {
  iv: Uint8Array;
  data: Uint8Array;
  salt: Uint8Array;
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
  authMethod: "passkey" | "password";
  lastAuthTime: number;
  environment: "iframe" | "native";
  credentialId?: string;
}
