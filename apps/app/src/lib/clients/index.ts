import { BUNDLER_URL } from "@/config/constants";
import {
  WITHDRAWAL_ACCOUNT_PRIVATE_KEY,
  POOL_CHAIN,
  SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_WITHDRAW2_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAW2_PAYMASTER,
  SHINOBI_CASH_SUPPORTED_CHAINS,
  SAME_CHAIN_GAS_LIMITS,
  CROSS_CHAIN_GAS_LIMITS,
  WITHDRAW2_SAME_CHAIN_GAS_LIMITS,
  WITHDRAW2_CROSS_CHAIN_GAS_LIMITS,
  WITHDRAWAL_REFUND_GAS_LIMITS,
} from "@shinobi-cash/constants";
import { createSmartAccountClient, type SmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { http, createPublicClient } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";

export type GasLimits = typeof SAME_CHAIN_GAS_LIMITS;

export interface WithdrawalSmartAccountClient {
  smartAccountClient: SmartAccountClient;
  gasLimits: GasLimits;
}

export function getPublicClient(chainId: number) {
  const chain = SHINOBI_CASH_SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
  if (!chain) {
    throw new Error(`Unsupported chain ${chainId}`);
  }
  return createPublicClient({
    chain: chain as never,
    transport: http(),
  });
}

export const pimlicoClient = createPimlicoClient({
  transport: http(BUNDLER_URL),
  entryPoint: {
    address: entryPoint07Address,
    version: "0.7",
  },
});

/**
 * Create a smart account client with fixed gas limits for withdrawal operations.
 * Uses hardcoded gas limits to avoid bundler estimation which can trigger
 * paymaster validation errors due to gas cost mismatches.
 */
async function createWithdrawalSmartAccountClient(
  paymasterAddress: `0x${string}`,
  gasLimits: GasLimits
): Promise<WithdrawalSmartAccountClient> {
  const account = privateKeyToAccount(WITHDRAWAL_ACCOUNT_PRIVATE_KEY as `0x${string}`);
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
      async getPaymasterStubData() {
        return {
          paymaster: paymasterAddress,
          paymasterData: "0x" as `0x${string}`,
          paymasterVerificationGasLimit: gasLimits.PAYMASTER_VERIFICATION_GAS_LIMIT,
          paymasterPostOpGasLimit: gasLimits.POST_OP_GAS_LIMIT,
        };
      },
      async getPaymasterData() {
        return {
          paymaster: paymasterAddress,
          paymasterData: "0x" as `0x${string}`,
          paymasterVerificationGasLimit: gasLimits.PAYMASTER_VERIFICATION_GAS_LIMIT,
          paymasterPostOpGasLimit: gasLimits.POST_OP_GAS_LIMIT,
        };
      },
    },
    userOperation: {
      estimateFeesPerGas: async () => {
        const gasPrices = await pimlicoClient.getUserOperationGasPrice();
        return gasPrices.fast;
      },
    },
  });

  return { smartAccountClient, gasLimits };
}

export async function getWithdrawalSmartAccountClient(): Promise<WithdrawalSmartAccountClient> {
  return createWithdrawalSmartAccountClient(
    SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER.address as `0x${string}`,
    SAME_CHAIN_GAS_LIMITS
  );
}

export async function getCrosschainWithdrawalSmartAccountClient(): Promise<WithdrawalSmartAccountClient> {
  return createWithdrawalSmartAccountClient(
    SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER.address as `0x${string}`,
    CROSS_CHAIN_GAS_LIMITS
  );
}

export async function getWithdraw2SmartAccountClient(): Promise<WithdrawalSmartAccountClient> {
  return createWithdrawalSmartAccountClient(
    SHINOBI_CASH_WITHDRAW2_PAYMASTER.address as `0x${string}`,
    WITHDRAW2_SAME_CHAIN_GAS_LIMITS
  );
}

export async function getCrosschainWithdraw2SmartAccountClient(): Promise<WithdrawalSmartAccountClient> {
  return createWithdrawalSmartAccountClient(
    SHINOBI_CASH_CROSSCHAIN_WITHDRAW2_PAYMASTER.address as `0x${string}`,
    WITHDRAW2_CROSS_CHAIN_GAS_LIMITS
  );
}

export async function getRefundSmartAccountClient(): Promise<WithdrawalSmartAccountClient> {
  return createWithdrawalSmartAccountClient(
    SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER.address as `0x${string}`,
    WITHDRAWAL_REFUND_GAS_LIMITS
  );
}
