/**
 * Auth Types
 */

/** Branded type for wallet account IDs. Format: `{address}:chain-{chainId}` */
export type WalletAccountId = string & { readonly __brand: "WalletAccountId" };

export interface EIP712MessageOptions {
  deterministic?: boolean;
}

export interface EIP712TypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
  };
  types: {
    ShinobiAuth: readonly [
      { name: "wallet"; type: "address" },
      { name: "action"; type: "string" },
      { name: "message"; type: "string" },
      { name: "version"; type: "string" },
    ];
  };
  primaryType: "ShinobiAuth";
  message: {
    wallet: `0x${string}`;
    action: string;
    message: string;
    version: string;
  };
}

export interface KeyGenerationResult {
  publicKey: string;
  privateKey: string;
  address: string;
}
