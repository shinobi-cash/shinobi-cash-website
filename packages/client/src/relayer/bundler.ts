/**
 * Bundler relayer — ERC-4337 implementation.
 *
 * Wraps smart accounts, UserOps, and paymasters behind
 * the ShinobiRelayer interface. Works with any bundler URL.
 */

import {
  WITHDRAWAL_ACCOUNT_PRIVATE_KEY,
  POOL_CHAIN,
  FEE_CONFIG,
  SAME_CHAIN_GAS_LIMITS,
  CROSS_CHAIN_GAS_LIMITS,
  WITHDRAW2_SAME_CHAIN_GAS_LIMITS,
  WITHDRAW2_CROSS_CHAIN_GAS_LIMITS,
  WITHDRAWAL_REFUND_GAS_LIMITS,
  SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_WITHDRAW2_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAW2_PAYMASTER,
  SHINOBI_CASH_ENTRYPOINT,
} from "@shinobi-cash/constants";
import type { GasLimits } from "@shinobi-cash/core/fees";
import { calculateTotalGas, calculateRelayFeeBPS } from "@shinobi-cash/core/fees";
import type { Call } from "@shinobi-cash/core/account";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { http, createPublicClient, type PublicClient } from "viem";
import {
  createBundlerClient,
  type BundlerClient,
  entryPoint07Address,
  type UserOperation,
} from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import type { TransactionReceipt } from "viem";
import { getChain } from "@shinobi-cash/constants/chains";
import type { ShinobiRelayer, RelayOperationType } from "../types.js";

// ============================================================================
// Mappings: operation type → paymaster address + gas limits
// ============================================================================

const PAYMASTER_MAP: Record<RelayOperationType, `0x${string}`> = {
  "withdraw": SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER.address as `0x${string}`,
  "withdraw-crosschain": SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER.address as `0x${string}`,
  "withdraw2": SHINOBI_CASH_WITHDRAW2_PAYMASTER.address as `0x${string}`,
  "withdraw2-crosschain": SHINOBI_CASH_CROSSCHAIN_WITHDRAW2_PAYMASTER.address as `0x${string}`,
  "refund": SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER.address as `0x${string}`,
};

const GAS_LIMITS_MAP: Record<RelayOperationType, GasLimits> = {
  "withdraw": SAME_CHAIN_GAS_LIMITS,
  "withdraw-crosschain": CROSS_CHAIN_GAS_LIMITS,
  "withdraw2": WITHDRAW2_SAME_CHAIN_GAS_LIMITS,
  "withdraw2-crosschain": WITHDRAW2_CROSS_CHAIN_GAS_LIMITS,
  "refund": WITHDRAWAL_REFUND_GAS_LIMITS,
};

// ============================================================================
// Smart account helpers
// ============================================================================

async function createSmartAccountForWithdrawal(
  bundlerUrl: string,
  publicClient: PublicClient,
  paymasterAddress: `0x${string}`,
  gasLimits: GasLimits,
): Promise<BundlerClient> {
  const account = privateKeyToAccount(WITHDRAWAL_ACCOUNT_PRIVATE_KEY);

  const simpleAccount = await toSimpleSmartAccount({
    owner: account,
    client: publicClient,
    entryPoint: { address: entryPoint07Address, version: "0.7" },
  });

  return createBundlerClient({
    client: publicClient,
    account: simpleAccount,
    transport: http(bundlerUrl),
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
        return await publicClient.estimateFeesPerGas();
      },
    },
  });
}

async function prepareUserOp(
  bundlerClient: BundlerClient,
  publicClient: PublicClient,
  call: Call,
  gasLimits: GasLimits,
): Promise<UserOperation<"0.7">> {
  if (!bundlerClient.account) {
    throw new Error("Smart account not initialized");
  }

  const target = call.to || (SHINOBI_CASH_ENTRYPOINT.address as `0x${string}`);
  const gasPrices = await publicClient.estimateFeesPerGas();

  return bundlerClient.prepareUserOperation({
    account: bundlerClient.account,
    calls: [{ to: target, data: call.data, value: BigInt(0) }],
    callGasLimit: gasLimits.CALL_GAS_LIMIT,
    verificationGasLimit: gasLimits.VERIFICATION_GAS_LIMIT,
    preVerificationGas: gasLimits.PRE_VERIFICATION_GAS,
    maxFeePerGas: gasPrices.maxFeePerGas,
    maxPriorityFeePerGas: gasPrices.maxPriorityFeePerGas,
  });
}

async function executeUserOp(
  bundlerClient: BundlerClient,
  userOp: UserOperation<"0.7">,
  gasLimits: GasLimits,
): Promise<{ userOpHash: string; receipt: TransactionReceipt }> {
  userOp.callGasLimit = gasLimits.CALL_GAS_LIMIT;
  userOp.verificationGasLimit = gasLimits.VERIFICATION_GAS_LIMIT;
  userOp.preVerificationGas = gasLimits.PRE_VERIFICATION_GAS;
  userOp.paymasterVerificationGasLimit = gasLimits.PAYMASTER_VERIFICATION_GAS_LIMIT;
  userOp.paymasterPostOpGasLimit = gasLimits.POST_OP_GAS_LIMIT;

  const signature = await bundlerClient.account?.signUserOperation(userOp);
  const userOpHash = await bundlerClient.sendUserOperation({
    entryPointAddress: entryPoint07Address,
    ...userOp,
    signature,
  });

  const result = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });

  if (!result.success) {
    throw new Error(`UserOperation failed: ${result.reason || "unknown reason"}`);
  }

  return { userOpHash, receipt: result.receipt as TransactionReceipt };
}

// ============================================================================
// Factory
// ============================================================================

export function createBundlerRelayer(config: { url: string }): ShinobiRelayer {
  const { url } = config;

  const publicClient = createPublicClient({
    chain: getChain(POOL_CHAIN.id),
    transport: http(),
  });

  // Track bundler clients for waitForReceipt
  const pendingOps = new Map<string, BundlerClient>();

  return {
    getRelayAddress(type: RelayOperationType): `0x${string}` {
      return PAYMASTER_MAP[type];
    },

    async quoteRelayFee(params: { type: RelayOperationType; amountWei: bigint }): Promise<{ relayFeeBPS: number }> {
      const gasLimits = GAS_LIMITS_MAP[params.type];
      const gasPrices = await publicClient.estimateFeesPerGas();
      const gasPriceWei = gasPrices.maxFeePerGas;
      const totalGas = calculateTotalGas(gasLimits);
      const gasCostWei = totalGas * gasPriceWei;
      const relayFeeBPS = calculateRelayFeeBPS(params.amountWei, gasCostWei, FEE_CONFIG.MAX_RELAY_FEE_BPS);
      return { relayFeeBPS };
    },

    async sendTransaction(params: { call: Call; type: RelayOperationType }): Promise<string> {
      const paymasterAddress = PAYMASTER_MAP[params.type];
      const gasLimits = GAS_LIMITS_MAP[params.type];

      const bundlerClient = await createSmartAccountForWithdrawal(url, publicClient, paymasterAddress, gasLimits);
      const userOp = await prepareUserOp(bundlerClient, publicClient, params.call, gasLimits);

      userOp.callGasLimit = gasLimits.CALL_GAS_LIMIT;
      userOp.verificationGasLimit = gasLimits.VERIFICATION_GAS_LIMIT;
      userOp.preVerificationGas = gasLimits.PRE_VERIFICATION_GAS;
      userOp.paymasterVerificationGasLimit = gasLimits.PAYMASTER_VERIFICATION_GAS_LIMIT;
      userOp.paymasterPostOpGasLimit = gasLimits.POST_OP_GAS_LIMIT;

      const signature = await bundlerClient.account?.signUserOperation(userOp);
      const userOpHash = await bundlerClient.sendUserOperation({
        entryPointAddress: entryPoint07Address,
        ...userOp,
        signature,
      });

      pendingOps.set(userOpHash, bundlerClient);
      return userOpHash;
    },

    async waitForReceipt(txId: string): Promise<TransactionReceipt> {
      const bundlerClient = pendingOps.get(txId);
      if (!bundlerClient) {
        throw new Error(`No pending operation found for txId: ${txId}`);
      }

      try {
        const result = await bundlerClient.waitForUserOperationReceipt({ hash: txId as `0x${string}` });
        if (!result.success) {
          throw new Error(`UserOperation failed: ${result.reason || "unknown reason"}`);
        }
        return result.receipt as TransactionReceipt;
      } finally {
        pendingOps.delete(txId);
      }
    },
  };
}
