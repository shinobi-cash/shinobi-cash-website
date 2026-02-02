import { BUNDLER_URL } from "@/config/constants";
import {
  WITHDRAWAL_ACCOUNT_PRIVATE_KEY,
  POOL_CHAIN,
  SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_WITHDRAW2_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAW2_PAYMASTER,
  SHINOBI_CASH_SUPPORTED_CHAINS,
} from "@shinobi-cash/constants";
import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { http, createPublicClient } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";

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
      async getPaymasterStubData() {
        return {
          paymaster: paymasterAddress,
          paymasterData: "0x" as `0x${string}`,
          paymasterPostOpGasLimit: BigInt(150000),
        };
      },
      async getPaymasterData() {
        return {
          paymaster: paymasterAddress,
          paymasterData: "0x" as `0x${string}`,
          paymasterPostOpGasLimit: BigInt(150000),
        };
      },
    },
  });
  return smartAccountClient;
}

export async function getWithdrawalSmartAccountClient() {
  return createWithdrawalSmartAccountClient(SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER.address);
}

export async function getCrosschainWithdrawalSmartAccountClient() {
  return createWithdrawalSmartAccountClient(SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER.address);
}

export async function getWithdraw2SmartAccountClient() {
  return createWithdrawalSmartAccountClient(SHINOBI_CASH_WITHDRAW2_PAYMASTER.address);
}

export async function getCrosschainWithdraw2SmartAccountClient() {
  return createWithdrawalSmartAccountClient(SHINOBI_CASH_CROSSCHAIN_WITHDRAW2_PAYMASTER.address);
}
