/**
 * Singleton Client Instances
 */

import { BUNDLER_URL } from "@/config/constants";
import {
  WITHDRAWAL_ACCOUNT_PRIVATE_KEY,
  POOL_CHAIN,
  SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_SUPPORTED_CHAINS,
} from "@shinobi-cash/constants";
import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { http, createPublicClient } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Get public client for specific chain
 * @returns Public client for the specified chain
 */
export function getPublicClient(chainId: number) {
  const chain = SHINOBI_CASH_SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
  if (chain == undefined) {
    throw new Error(`Unsupported chain ${chainId}`);
  }
  const client = createPublicClient({
    chain: chain as never,
    transport: http(),
  });
  if (!client) {
    throw new Error(`No public client configured for chain ${chainId}`);
  }
  return client;
}

export const pimlicoClient = createPimlicoClient({
  transport: http(BUNDLER_URL),
  entryPoint: {
    address: entryPoint07Address,
    version: "0.7",
  },
});

/**
 * Factory function to create a smart account client with specified paymaster
 * Extracted common logic to reduce duplication
 */
async function createWithdrawalSmartAccountClient(paymasterAddress: `0x${string}`) {
  const account = privateKeyToAccount(WITHDRAWAL_ACCOUNT_PRIVATE_KEY);
  const publicClient = createPublicClient({
    chain: POOL_CHAIN as never,
    transport: http(),
  });

  const simpleAccount = await toSimpleSmartAccount({
    owner: account,
    client: publicClient,
    entryPoint: { address: entryPoint07Address, version: "0.7" },
  });

  const smartAccountClient = createSmartAccountClient({
    client: publicClient,
    account: simpleAccount,
    bundlerTransport: http(BUNDLER_URL),
    paymaster: {
      // Provide stub data for gas estimation - just hardcode high gas values
      async getPaymasterStubData() {
        return {
          paymaster: paymasterAddress,
          paymasterData: "0x" as `0x${string}`, // Empty paymaster data
          paymasterPostOpGasLimit: BigInt(35000), // Above the 32,000 minimum
        };
      },
      // Provide real paymaster data for actual transaction
      async getPaymasterData() {
        return {
          paymaster: paymasterAddress,
          paymasterData: "0x" as `0x${string}`, // Empty - paymaster validates via callData
          paymasterPostOpGasLimit: BigInt(35000), // Above the 32,000 minimum
        };
      },
    },
  });
  return smartAccountClient;
}

/**
 * Get smart account client for same-chain withdrawals
 */
export async function getWithdrawalSmartAccountClient() {
  return createWithdrawalSmartAccountClient(SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER.address);
}

/**
 * Get smart account client for cross-chain withdrawals
 */
export async function getCrosschainWithdrawalSmartAccountClient() {
  return createWithdrawalSmartAccountClient(SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER.address);
}
