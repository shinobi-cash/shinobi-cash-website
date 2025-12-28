/**
 * Withdrawal Feature Constants
 */

/**
 * Number of decimal places to display for ETH amounts
 * Centralized to prevent UI inconsistency
 */
export const DISPLAY_DECIMALS = 4;

/**
 * Default asset for withdrawals
 */
export const ETH_ASSET = {
  symbol: "ETH",
  name: "Ethereum",
  icon: "/ethereum.svg",
} as const;

/**
 * UserOperation Gas Limits for Same-Chain Withdrawals
 * Total: ~1,350,000 gas
 */
export const SAME_CHAIN_GAS_LIMITS = {
  // Gas for executing the main withdrawal call
  CALL_GAS_LIMIT: BigInt(550000),

  // Gas for account verification
  VERIFICATION_GAS_LIMIT: BigInt(200000),

  // Pre-verification gas overhead
  PRE_VERIFICATION_GAS: BigInt(168000),

  // Gas for paymaster verification
  PAYMASTER_VERIFICATION_GAS_LIMIT: BigInt(400000),

  // Gas for paymaster post-operation (from contract)
  POST_OP_GAS_LIMIT: BigInt(32000),
} as const;

/**
 * UserOperation Gas Limits for Cross-Chain Withdrawals
 * 25% higher for CALL_GAS_LIMIT and PAYMASTER_VERIFICATION_GAS_LIMIT
 * due to additional complexity (OIF intent creation, solver fees, etc.)
 *
 * Total: ~1,637,500 gas
 */
export const CROSS_CHAIN_GAS_LIMITS = {
  // Gas for executing the main withdrawal call (+25%)
  CALL_GAS_LIMIT: BigInt(687500), // 550000 * 1.25

  // Gas for account verification (same as same-chain)
  VERIFICATION_GAS_LIMIT: BigInt(200000),

  // Pre-verification gas overhead (same as same-chain)
  PRE_VERIFICATION_GAS: BigInt(168000),

  // Gas for paymaster verification (+25%)
  PAYMASTER_VERIFICATION_GAS_LIMIT: BigInt(500000), // 400000 * 1.25

  // Gas for paymaster post-operation (from contract)
  POST_OP_GAS_LIMIT: BigInt(32000),
} as const;

/**
 * Contract Configuration Values
 * These values match the contract configuration
 */
export const WITHDRAWAL_CONFIG = {
  // Maximum relay fee in basis points (15%)
  // Must match contract's assetConfig[ETH].maxRelayFeeBPS
  MAX_RELAY_FEE_BPS: 1500,

  // Minimum deposit amount (0.0001 ETH)
  MINIMUM_DEPOSIT_AMOUNT: BigInt(100000000000000),

  // Vetting fee in basis points (0.1%)
  VETTING_FEE_BPS: 10,
} as const;
