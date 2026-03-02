/**
 * Provider adapter interfaces for chain interactions.
 * Consumers implement these with their preferred library (viem, ethers, etc.)
 */

export type ReadProvider = {
  /** Read a contract view/pure function */
  readContract(params: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    chainId?: number;
  }): Promise<unknown>;

  /** Get the connected chain ID */
  getChainId(): Promise<number>;
};

export type WriteProvider = ReadProvider & {
  /** Send a transaction and return the tx hash */
  sendTransaction(params: {
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
    chainId?: number;
  }): Promise<`0x${string}`>;

  /** Get the connected account address */
  getAccount(): Promise<`0x${string}`>;
};

export type SignProvider = {
  /** Sign EIP-712 typed data */
  signTypedData(params: {
    domain: {
      name: string;
      version: string;
      chainId: number;
    };
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  }): Promise<`0x${string}`>;
};
