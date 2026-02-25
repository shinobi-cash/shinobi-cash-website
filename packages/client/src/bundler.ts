/**
 * Bundler infrastructure — Pimlico client and smart account setup.
 * Ported from apps/app/src/lib/clients/index.ts, parametrized (no singletons).
 */

import { WITHDRAWAL_ACCOUNT_PRIVATE_KEY, POOL_CHAIN } from "@shinobi-cash/constants";
import type { GasLimits } from "@shinobi-cash/core/fees";
import { createSmartAccountClient, type SmartAccountClient } from "permissionless";
import { createPimlicoClient, type PimlicoClient } from "permissionless/clients/pimlico";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { http, createPublicClient } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { getViemChain } from "./chains.js";

export function createPimlicoInstance(bundlerUrl: string): PimlicoClient {
  return createPimlicoClient({
    transport: http(bundlerUrl),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });
}

export async function createSmartAccountForWithdrawal(
  bundlerUrl: string,
  paymasterAddress: `0x${string}`,
  gasLimits: GasLimits
): Promise<{ smartAccountClient: SmartAccountClient; gasLimits: GasLimits }> {
  const pimlico = createPimlicoInstance(bundlerUrl);
  const account = privateKeyToAccount(WITHDRAWAL_ACCOUNT_PRIVATE_KEY);

  const publicClient = createPublicClient({
    chain: getViemChain(POOL_CHAIN.id),
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
    bundlerTransport: http(bundlerUrl),
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
        const gasPrices = await pimlico.getUserOperationGasPrice();
        return gasPrices.fast;
      },
    },
  });

  return { smartAccountClient, gasLimits };
}
