/**
 * UserOperation lifecycle — prepare and execute.
 * Ported from apps/app/src/utils/withdrawalContract.ts
 */

import { SHINOBI_CASH_ENTRYPOINT } from "@shinobi-cash/constants";
import type { GasLimits } from "@shinobi-cash/core/fees";
import type { PimlicoClient } from "permissionless/clients/pimlico";
import type { SmartAccountClient } from "permissionless";
import { type UserOperation, entryPoint07Address } from "viem/account-abstraction";

export async function prepareUserOp(
  smartAccountClient: SmartAccountClient,
  pimlicoClient: PimlicoClient,
  callData: `0x${string}`,
  gasLimits: GasLimits,
  target: `0x${string}` = SHINOBI_CASH_ENTRYPOINT.address as `0x${string}`
): Promise<UserOperation<"0.7">> {
  if (!smartAccountClient.account) {
    throw new Error("Smart account not initialized");
  }

  const gasPrices = await pimlicoClient.getUserOperationGasPrice();

  return smartAccountClient.prepareUserOperation({
    account: smartAccountClient.account,
    calls: [{ to: target, data: callData, value: BigInt(0) }],
    callGasLimit: gasLimits.CALL_GAS_LIMIT,
    verificationGasLimit: gasLimits.VERIFICATION_GAS_LIMIT,
    preVerificationGas: gasLimits.PRE_VERIFICATION_GAS,
    ...gasPrices.fast,
  });
}

export async function executeUserOp(
  smartAccountClient: SmartAccountClient,
  userOp: UserOperation,
  gasLimits: GasLimits
): Promise<string> {
  // Ensure gas limits are set
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

  const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash: userOpHash });

  if (!receipt.success) {
    throw new Error(`UserOperation failed: ${receipt.reason || "unknown reason"}`);
  }

  return receipt.receipt.transactionHash;
}
