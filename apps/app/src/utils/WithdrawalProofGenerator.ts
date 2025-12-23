/**
 * Withdrawal Proof Generator for Privacy Pool
 *
 * Migrated to use @shinobi-cash/core SDK with browser-specific circuit loaders
 * Original implementation backed up to WithdrawalProofGenerator.ts.backup
 * Migrated: 2025-01-06
 */

import {
  WithdrawalProofGenerator as SDKProofGenerator,
  type CircuitFileLoader,
  type WithdrawalProofData,
} from "@shinobi-cash/core";

// Re-export types for convenience
export type { WithdrawalProofData };

// ============ BROWSER-SPECIFIC CIRCUIT LOADERS ============

/**
 * Browser-specific circuit loader for regular withdrawals
 * Loads circuit files from the /circuits/ public directory using fetch
 */
const loadWithdrawalCircuits: CircuitFileLoader = async () => {
  console.log("📥 Loading withdrawal circuit files...");

  const [wasmResponse, zkeyResponse, vkeyResponse] = await Promise.all([
    fetch("/circuits/build/withdraw/withdraw.wasm"),
    fetch("/circuits/keys/withdraw.zkey"),
    fetch("/circuits/keys/withdraw.vkey"),
  ]);

  if (!wasmResponse.ok || !zkeyResponse.ok || !vkeyResponse.ok) {
    throw new Error("Failed to load withdrawal circuit files from public directory");
  }

  const [wasmBuffer, zkeyBuffer, vkeyData] = await Promise.all([
    wasmResponse.arrayBuffer(),
    zkeyResponse.arrayBuffer(),
    vkeyResponse.json(),
  ]);

  console.log("✅ Withdrawal circuit files loaded successfully");

  return {
    wasmFile: new Uint8Array(wasmBuffer),
    zkeyFile: new Uint8Array(zkeyBuffer),
    vkeyData,
  };
};

/**
 * Browser-specific circuit loader for crosschain withdrawals
 * Loads circuit files from the /circuits/ public directory using fetch
 */
const loadCrosschainCircuits: CircuitFileLoader = async () => {
  console.log("📥 Loading crosschain withdrawal circuit files...");

  const [wasmResponse, zkeyResponse, vkeyResponse] = await Promise.all([
    fetch("/circuits/build/crosschain_withdraw/crosschain_withdrawal.wasm"),
    fetch("/circuits/keys/crosschain_withdrawal.zkey"),
    fetch("/circuits/keys/crosschain_withdrawal.vkey"),
  ]);

  if (!wasmResponse.ok || !zkeyResponse.ok || !vkeyResponse.ok) {
    throw new Error("Failed to load crosschain circuit files from public directory");
  }

  const [wasmBuffer, zkeyBuffer, vkeyData] = await Promise.all([
    wasmResponse.arrayBuffer(),
    zkeyResponse.arrayBuffer(),
    vkeyResponse.json(),
  ]);

  console.log("✅ Crosschain circuit files loaded successfully");

  return {
    wasmFile: new Uint8Array(wasmBuffer),
    zkeyFile: new Uint8Array(zkeyBuffer),
    vkeyData,
  };
};

// ============ PROOF GENERATOR CLASS ============

/**
 * Withdrawal Proof Generator with browser-specific circuit loading
 *
 * Extends the SDK's WithdrawalProofGenerator with browser fetch-based circuit loaders.
 * This allows the same SDK to be used in Node.js (with fs loaders) or browsers (with fetch loaders).
 */
export class WithdrawalProofGenerator extends SDKProofGenerator {
  constructor() {
    super(loadWithdrawalCircuits, loadCrosschainCircuits);
  }
}

// ============ SINGLETON INSTANCE ============

/**
 * Singleton instance of the withdrawal proof generator
 * Pre-configured with browser circuit loaders
 */
export const withdrawalProofGenerator = new WithdrawalProofGenerator();
