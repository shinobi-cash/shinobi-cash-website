/**
 * Bundler relayer — ERC-4337 implementation using Pimlico.
 *
 * Wraps smart accounts, UserOps, and paymasters behind
 * the ShinobiRelayer interface.
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
import { createSmartAccountClient, type SmartAccountClient } from "permissionless";
import { createPimlicoClient, type PimlicoClient } from "permissionless/clients/pimlico";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { http, createPublicClient } from "viem";
import { entryPoint07Address, type UserOperation } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import type { TransactionReceipt } from "viem";
import { getViemChain } from "../chains.js";
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
  pimlico: PimlicoClient,
  paymasterAddress: `0x${string}`,
  gasLimits: GasLimits,
): Promise<SmartAccountClient> {
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

  return createSmartAccountClient({
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
}

async function prepareUserOp(
  smartAccountClient: SmartAccountClient,
  pimlicoClient: PimlicoClient,
  call: Call,
  gasLimits: GasLimits,
): Promise<UserOperation<"0.7">> {
  if (!smartAccountClient.account) {
    throw new Error("Smart account not initialized");
  }

  const target = call.to || (SHINOBI_CASH_ENTRYPOINT.address as `0x${string}`);
  const gasPrices = await pimlicoClient.getUserOperationGasPrice();

  return smartAccountClient.prepareUserOperation({
    account: smartAccountClient.account,
    calls: [{ to: target, data: call.data, value: BigInt(0) }],
    callGasLimit: gasLimits.CALL_GAS_LIMIT,
    verificationGasLimit: gasLimits.VERIFICATION_GAS_LIMIT,
    preVerificationGas: gasLimits.PRE_VERIFICATION_GAS,
    ...gasPrices.fast,
  });
}

async function executeUserOp(
  smartAccountClient: SmartAccountClient,
  userOp: UserOperation<"0.7">,
  gasLimits: GasLimits,
): Promise<{ userOpHash: string; receipt: TransactionReceipt }> {
  userOp.callGasLimit = gasLimits.CALL_GAS_LIMIT;
  userOp.verificationGasLimit = gasLimits.VERIFICATION_GAS_LIMIT;
  userOp.preVerificationGas = gasLimits.PRE_VERIFICATION_GAS;
  userOp.paymasterVerificationGasLimit = gasLimits.PAYMASTER_VERIFICATION_GAS_LIMIT;
  userOp.paymasterPostOpGasLimit = gasLimits.POST_OP_GAS_LIMIT;

  const signature = await smartAccountClient.account?.signUserOperation(userOp);
  const userOpHash = await smartAccountClient.sendUserOperation({
    entryPointAddress: entryPoint07Address,
    ...userOp,
    signature,
  });

  const result = await smartAccountClient.waitForUserOperationReceipt({ hash: userOpHash });

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
  const pimlico = createPimlicoClient({
    transport: http(url),
    entryPoint: { address: entryPoint07Address, version: "0.7" },
  });

  // Track smart account clients for waitForReceipt
  const pendingOps = new Map<string, SmartAccountClient>();

  return {
    getRelayAddress(type: RelayOperationType): `0x${string}` {
      return PAYMASTER_MAP[type];
    },

    async quoteRelayFee(params: { type: RelayOperationType; amountWei: bigint }): Promise<{ relayFeeBPS: number }> {
      const gasLimits = GAS_LIMITS_MAP[params.type];
      const gasPrices = await pimlico.getUserOperationGasPrice();
      const gasPriceWei = gasPrices.fast.maxFeePerGas;
      const totalGas = calculateTotalGas(gasLimits);
      const gasCostWei = totalGas * gasPriceWei;
      const relayFeeBPS = calculateRelayFeeBPS(params.amountWei, gasCostWei, FEE_CONFIG.MAX_RELAY_FEE_BPS);
      return { relayFeeBPS };
    },

    async sendTransaction(params: { call: Call; type: RelayOperationType }): Promise<string> {
      const paymasterAddress = PAYMASTER_MAP[params.type];
      const gasLimits = GAS_LIMITS_MAP[params.type];

      const smartAccountClient = await createSmartAccountForWithdrawal(url, pimlico, paymasterAddress, gasLimits);
      const userOp = await prepareUserOp(smartAccountClient, pimlico, params.call, gasLimits);

      userOp.callGasLimit = gasLimits.CALL_GAS_LIMIT;
      userOp.verificationGasLimit = gasLimits.VERIFICATION_GAS_LIMIT;
      userOp.preVerificationGas = gasLimits.PRE_VERIFICATION_GAS;
      userOp.paymasterVerificationGasLimit = gasLimits.PAYMASTER_VERIFICATION_GAS_LIMIT;
      userOp.paymasterPostOpGasLimit = gasLimits.POST_OP_GAS_LIMIT;

      const signature = await smartAccountClient.account?.signUserOperation(userOp);
      const userOpHash = await smartAccountClient.sendUserOperation({
        entryPointAddress: entryPoint07Address,
        ...userOp,
        signature,
      });

      pendingOps.set(userOpHash, smartAccountClient);
      return userOpHash;
    },

    async waitForReceipt(txId: string): Promise<TransactionReceipt> {
      const smartAccountClient = pendingOps.get(txId);
      if (!smartAccountClient) {
        throw new Error(`No pending operation found for txId: ${txId}`);
      }

      try {
        const result = await smartAccountClient.waitForUserOperationReceipt({ hash: txId as `0x${string}` });
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
