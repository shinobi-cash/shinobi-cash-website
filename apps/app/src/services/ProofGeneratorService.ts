/**
 * Withdrawal Proof Generator for Privacy Pool
 *
 * Browser-specific circuit loaders for ZK proof generation.
 */

import { createProofGenerator, type CircuitFileLoader } from "@shinobi-cash/core/proof";

/**
 * Load same-chain withdrawal circuits from public directory
 */
const loadWithdrawalCircuits: CircuitFileLoader = async () => {
  const [wasmResponse, zkeyResponse, vkeyResponse] = await Promise.all([
    fetch("/circuits/build/withdraw/withdraw.wasm"),
    fetch("/circuits/keys/withdraw.zkey"),
    fetch("/circuits/keys/withdraw.vkey"),
  ]);

  if (!wasmResponse.ok || !zkeyResponse.ok || !vkeyResponse.ok) {
    throw new Error("Failed to load withdrawal circuit files");
  }

  const [wasmBuffer, zkeyBuffer, vkeyData] = await Promise.all([
    wasmResponse.arrayBuffer(),
    zkeyResponse.arrayBuffer(),
    vkeyResponse.json(),
  ]);

  return {
    wasmFile: new Uint8Array(wasmBuffer),
    zkeyFile: new Uint8Array(zkeyBuffer),
    vkeyData,
  };
};

/**
 * Load cross-chain withdrawal circuits from public directory
 */
const loadCrosschainCircuits: CircuitFileLoader = async () => {
  const [wasmResponse, zkeyResponse, vkeyResponse] = await Promise.all([
    fetch("/circuits/build/crosschain_withdraw/crosschain_withdrawal.wasm"),
    fetch("/circuits/keys/crosschain_withdrawal.zkey"),
    fetch("/circuits/keys/crosschain_withdrawal.vkey"),
  ]);

  if (!wasmResponse.ok || !zkeyResponse.ok || !vkeyResponse.ok) {
    throw new Error("Failed to load crosschain circuit files");
  }

  const [wasmBuffer, zkeyBuffer, vkeyData] = await Promise.all([
    wasmResponse.arrayBuffer(),
    zkeyResponse.arrayBuffer(),
    vkeyResponse.json(),
  ]);

  return {
    wasmFile: new Uint8Array(wasmBuffer),
    zkeyFile: new Uint8Array(zkeyBuffer),
    vkeyData,
  };
};

/**
 * Singleton proof generator with browser circuit loaders
 */
export const withdrawalProofGenerator = createProofGenerator(
  loadWithdrawalCircuits,
  loadCrosschainCircuits,
);
