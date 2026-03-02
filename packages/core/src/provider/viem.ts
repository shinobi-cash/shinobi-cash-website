/**
 * Viem adapter — reference implementation for provider interfaces.
 *
 * Uses duck typing so viem is NOT a dependency of core.
 * Consumers must have viem in their own project.
 */
import type { ReadProvider, WriteProvider, SignProvider } from "./types.js";

/** Create a ReadProvider from a viem PublicClient */
export function createViemReadProvider(publicClient: {
  readContract: (params: any) => Promise<any>;
  getChainId: () => Promise<number>;
}): ReadProvider {
  return {
    readContract: (params) => publicClient.readContract(params),
    getChainId: () => publicClient.getChainId(),
  };
}

/** Create a WriteProvider from a viem PublicClient + WalletClient */
export function createViemWriteProvider(
  publicClient: {
    readContract: (params: any) => Promise<any>;
    getChainId: () => Promise<number>;
  },
  walletClient: {
    sendTransaction: (params: any) => Promise<`0x${string}`>;
    account: { address: `0x${string}` };
  }
): WriteProvider {
  return {
    readContract: (params) => publicClient.readContract(params),
    getChainId: () => publicClient.getChainId(),
    sendTransaction: (params) => walletClient.sendTransaction(params),
    getAccount: async () => walletClient.account.address,
  };
}

/** Create a SignProvider from a viem WalletClient */
export function createViemSignProvider(walletClient: {
  signTypedData: (params: any) => Promise<`0x${string}`>;
}): SignProvider {
  return {
    signTypedData: (params) => walletClient.signTypedData(params),
  };
}
