/**
 * Application Constants
 *
 * Centralized configuration values, limits, and constants used throughout the application.
 * Organized by category for easy maintenance.
 */

import { CrosschainWithdrawalPaymasterAbi } from "../abi/CrosschainWithdrawalPaymasterAbi";
import { ShinobiCashEntrypointAbi } from "../abi/ShinobiCashEntrypointAbi";
import { ShinobiCashPoolAbi } from "../abi/ShinobiCashPoolAbi";
import { ShinobiCrosschainDepositEntrypointAbi } from "../abi/ShinobiCrosschainDepositEntrypointAbi";
import { ShinobiDepositOutputSettlerAbi } from "../abi/ShinobiDepositOutputSettlerAbi";
import { ShinobiWithdrawalOutputSettlerAbi } from "../abi/ShinobiWithdrawalOutputSettlerAbi";
import { SimpleShinobiCashPoolPaymasterAbi } from "../abi/SimpleShinobiCashPoolPaymasterAbi";
import { arbitrumSepolia, baseSepolia, type Chain } from 'viem/chains';
import { SUPPORTED_CROSSCHAIN } from "../network";

// ============ WITHDRAWAL CONSTANTS ============

/**
 * Default withdrawal account private key (deterministic for testing)
 * This should be moved to environment variables in production
 */
export const WITHDRAWAL_ACCOUNT_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;

/**
 * Default withdrawal fee rates
 */
export const WITHDRAWAL_FEES = {
  DEFAULT_RELAY_FEE_BPS: BigInt(1500), // 15% relay fee in basis points
  DEFAULT_SOLVER_FEE_BPS: BigInt(500),  // 5% solver fee in basis points
} as const;

/**
 * Withdrawal configuration values
 * These values match the contract configuration
 */
export const WITHDRAWAL_CONFIG = {
  /** Maximum relay fee in basis points (15%) - must match contract's maxRelayFeeBPS */
  MAX_RELAY_FEE_BPS: 1500,

  /** Default solver fee for cross-chain withdrawals (5%) */
  DEFAULT_SOLVER_FEE_BPS: 500,

  /** Minimum deposit amount (0.0001 ETH) */
  MINIMUM_DEPOSIT_AMOUNT: BigInt(100000000000000),

  /** Vetting fee in basis points (0.1%) */
  VETTING_FEE_BPS: 10,
} as const;

/**
 * UserOperation Gas Limits for Same-Chain Withdrawals
 * Total: ~1,350,000 gas
 */
export const SAME_CHAIN_GAS_LIMITS = {
  /** Gas for executing the main withdrawal call */
  CALL_GAS_LIMIT: BigInt(550000),

  /** Gas for account verification */
  VERIFICATION_GAS_LIMIT: BigInt(200000),

  /** Pre-verification gas overhead */
  PRE_VERIFICATION_GAS: BigInt(168000),

  /** Gas for paymaster verification */
  PAYMASTER_VERIFICATION_GAS_LIMIT: BigInt(400000),

  /** Gas for paymaster post-operation (from contract) */
  POST_OP_GAS_LIMIT: BigInt(32000),
} as const;

/**
 * UserOperation Gas Limits for Cross-Chain Withdrawals
 * 25% higher for CALL_GAS_LIMIT and PAYMASTER_VERIFICATION_GAS_LIMIT
 * due to additional complexity (OIF intent creation, solver fees, etc.)
 * Total: ~1,637,500 gas
 */
export const CROSS_CHAIN_GAS_LIMITS = {
  /** Gas for executing the main withdrawal call (+25%) */
  CALL_GAS_LIMIT: BigInt(687500), // 550000 * 1.25

  /** Gas for account verification (same as same-chain) */
  VERIFICATION_GAS_LIMIT: BigInt(200000),

  /** Pre-verification gas overhead (same as same-chain) */
  PRE_VERIFICATION_GAS: BigInt(168000),

  /** Gas for paymaster verification (+25%) */
  PAYMASTER_VERIFICATION_GAS_LIMIT: BigInt(500000), // 400000 * 1.25

  /** Gas for paymaster post-operation (from contract) */
  POST_OP_GAS_LIMIT: BigInt(32000),
} as const;

/**
 * Deposit fee configuration
 */
export const DEPOSIT_FEES = {
  /** Compliance/vetting fee in basis points (1%) */
  COMPLIANCE_FEE_BPS: 100,

  /** Default solver fee for cross-chain deposits (5%) */
  DEFAULT_SOLVER_FEE_BPS: 500,
} as const;

/**
 * Cross-chain deposit timing parameters (from contract defaults)
 */
export const CROSSCHAIN_DEPOSIT_TIMING = {
  FILL_DEADLINE_SECONDS: 3600, // 1 hour - solver must fill within this time
  EXPIRY_SECONDS: 86400, // 24 hours - user can refund after this time if not filled
} as const;

/**
 * Gas limits for Account Abstraction operations
 */
export const GAS_LIMITS = {
  PAYMASTER_POST_OP_GAS_LIMIT: 35000n, // Above the 32,000 minimum
} as const;

// ============ ZK CIRCUIT CONSTANTS ============

/**
 * Zero-knowledge proof and circuit parameters
 */
export const SNARK_SCALAR_FIELD = "21888242871839275222246405745257275088548364400416034343698204186575808495617";

// ============ INDEXER CONSTANTS ============

/**
 * IPFS configuration
 */
export const IPFS_GATEWAY_URL = "https://gateway.pinata.cloud/ipfs/";

// ============ TYPE DEFINITIONS ============

type ContractConfig = {
  chain: Chain;
  address: `0x${string}`;
  blockNumber: number;
  abi: readonly unknown[];
};

type CrossChainContracts = {
  DEPOSIT_ENTRYPOINT: ContractConfig;
  WITHDRAWAL_OUTPUT_SETTLER: ContractConfig;
  DEPOSIT_INPUT_SETTLER: ContractConfig;
  DEPOSIT_FILL_ORACLE: ContractConfig;
};

// ============ POOL CHAIN CONTRACTS ============

/**
 * Main entrypoint contract for same-chain and cross-chain operations
 */
export const SHINOBI_CASH_ENTRYPOINT: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x11C3E1332893A3E34273e6c81f245fA7fB84A52d',
  blockNumber: 214546382,
  abi: ShinobiCashEntrypointAbi
};

/**
 * ETH privacy pool contract
 */
export const SHINOBI_CASH_ETH_POOL: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x5543b250b8a44513BA91C0346BeE40890FfD7D18',
  blockNumber: 214550187,
  abi: ShinobiCashPoolAbi
};

/**
 * Withdrawal input settler for processing withdrawal intents
 */
export const SHINOBI_CASH_WITHDRAWAL_INPUT_SETTLER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: "0x31105923593a7A02F8CDE2e048E0acd178F5e4c5",
  blockNumber: 214550522,
  abi: []
};

/**
 * Deposit output settler for processing cross-chain deposit fills
 */
export const SHINOBI_CASH_DEPOSIT_OUTPUT_SETTLER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: "0x0B44BE1cA20749aa2ac2A4f078188f0E14d9DcA2",
  blockNumber: 214550698,
  abi: ShinobiDepositOutputSettlerAbi
};

/**
 * Paymaster for same-chain withdrawals (covers gas via pool funds)
 */
export const SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x4d09818A2C5Dc21D3EA4Ef93D721c52696fC31F3',
  blockNumber: 214552085,
  abi: SimpleShinobiCashPoolPaymasterAbi
};

/**
 * Paymaster for cross-chain withdrawals (covers gas via pool funds)
 */
export const SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x41a69bd2b52c32b1ad2bd729885f5287a07287f7',
  blockNumber: 0,
  abi: CrosschainWithdrawalPaymasterAbi
};

/**
 * Oracle for cross-chain withdrawal fills
 */
export const SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_FILL_ORACLE: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x4cb20f4415d3666e5d92e261de98fc9b7843d036',
  blockNumber: 0,
  abi: []
};

/**
 * Oracle for cross-chain deposit intents
 */
export const SHINOBI_CASH_CROSSCHAIN_DEPOSIT_INTENT_ORACLE: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x4cb20f4415d3666e5d92e261de98fc9b7843d036',
  blockNumber: 0,
  abi: []
};

// ============ CROSSCHAIN CONTRACTS ============

/**
 * Cross-chain contract deployments per supported chain
 * Includes deposit entrypoints and withdrawal settlers for each chain
 */
export const SHINOBI_CASH_CROSSCHAIN_CONTRACTS = {
  84532: {
    DEPOSIT_ENTRYPOINT: {
      chain: baseSepolia as Chain,
      address: '0x8ADb187D722C7B6088Ae56E9Fd7D12A1B11D5fd5',
      blockNumber: 36677486,
      abi: ShinobiCrosschainDepositEntrypointAbi
    },
    WITHDRAWAL_OUTPUT_SETTLER: {
      chain: baseSepolia as Chain,
      address: "0x621Ca010AE73309cF1FF6E75D53d26BEBCB0cfDe",
      blockNumber: 33603332,
      abi: ShinobiWithdrawalOutputSettlerAbi
    },
    DEPOSIT_INPUT_SETTLER: {
      chain: baseSepolia as Chain,
      address: '0x5f858C0700E634d795C094F4cc80667D8E873923',
      blockNumber: 36677560,
      abi: []
    },
    DEPOSIT_FILL_ORACLE: {
      chain: baseSepolia as Chain,
      address: '0x',
      blockNumber: 0,
      abi: []
    },
  }
} as const satisfies Record<typeof SUPPORTED_CROSSCHAIN[number]['id'], CrossChainContracts>;

// ============ SHARED CONTRACT ADDRESSES ============

/**
 * Shared contract addresses (standard across all networks)
 */
export const CONTRACTS = {
  // Expected smart account for deterministic pattern
  EXPECTED_SMART_ACCOUNT: "0xa3aBDC7f6334CD3EE466A115f30522377787c024" as `0x${string}`,

  // ERC-4337 EntryPoint (standard across all networks)
  ERC4337_ENTRYPOINT: "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as `0x${string}`,
} as const;