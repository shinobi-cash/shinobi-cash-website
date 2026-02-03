/**
 * Application Constants
 *
 * Centralized configuration values, limits, and constants used throughout the application.
 * Organized by category for easy maintenance.
 */

import {
  EntrypointRelayAbi,
  EntrypointDepositAbi,
  PoolScopeAbi,
  CrosschainDepositEntrypointAbi,
} from "../abi.js";
import { arbitrumSepolia, baseSepolia, type Chain } from 'viem/chains';
import { SUPPORTED_CROSSCHAIN } from "../network";

// ============ WITHDRAWAL CONSTANTS ============

/**
 * Withdrawal relay account private key
 * This is the well-known Hardhat/Foundry account #0, used deterministically
 * for the SimpleSmartAccount that the ShinobiCashPaymaster is configured to support.
 */
export const WITHDRAWAL_ACCOUNT_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;

/**
 * Fee configuration values
 * These values must match the contract configuration
 */
export const FEE_CONFIG = {
  /** Vetting/compliance fee in basis points (1%) - charged on all deposits */
  VETTING_FEE_BPS: 100,

  /** Maximum relay fee in basis points (15%) - max paymaster can charge */
  MAX_RELAY_FEE_BPS: 1500,

  /** Default solver fee for cross-chain operations (5%) */
  DEFAULT_SOLVER_FEE_BPS: 500,
} as const;

/**
 * Minimum amount configuration
 * These values must match the contract configuration
 */
export const MIN_AMOUNT_CONFIG = {
  /** Minimum deposit to pool (0.001 ETH) */
  MIN_POOL_DEPOSIT: BigInt("1000000000000000"), // 0.001 ETH

  /** Minimum cross-chain deposit (0.01 ETH) - higher due to solver economics */
  MIN_CROSSCHAIN_DEPOSIT: BigInt("10000000000000000"), // 0.01 ETH
} as const;

/**
 * @deprecated Use FEE_CONFIG and MIN_AMOUNT_CONFIG instead
 * Kept for backwards compatibility
 */
export const WITHDRAWAL_CONFIG = {
  MAX_RELAY_FEE_BPS: FEE_CONFIG.MAX_RELAY_FEE_BPS,
  DEFAULT_SOLVER_FEE_BPS: FEE_CONFIG.DEFAULT_SOLVER_FEE_BPS,
  MINIMUM_DEPOSIT_AMOUNT: MIN_AMOUNT_CONFIG.MIN_POOL_DEPOSIT,
  VETTING_FEE_BPS: FEE_CONFIG.VETTING_FEE_BPS,
} as const;

/**
 * UserOperation Gas Limits for Same-Chain Withdrawals
 * Total: ~1,350,000 gas
 */
export const SAME_CHAIN_GAS_LIMITS = {
  /** Gas for executing the main withdrawal call */
  CALL_GAS_LIMIT: BigInt(600000),

  /** Gas for account verification */
  VERIFICATION_GAS_LIMIT: BigInt(200000),

  /** Pre-verification gas overhead */
  PRE_VERIFICATION_GAS: BigInt(168000),

  /** Gas for paymaster verification */
  PAYMASTER_VERIFICATION_GAS_LIMIT: BigInt(450000),

  /** Gas for paymaster post-operation (from contract) */
  POST_OP_GAS_LIMIT: BigInt(100000),
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
  POST_OP_GAS_LIMIT: BigInt(100000),
} as const;

/**
 * UserOperation Gas Limits for Withdraw2 (2:1 merge) Same-Chain
 * ~50% higher than standard withdrawal due to verifying 2 inputs
 * Total: ~2,025,000 gas
 */
export const WITHDRAW2_SAME_CHAIN_GAS_LIMITS = {
  /** Gas for executing the main withdrawal call (+50%) */
  CALL_GAS_LIMIT: BigInt(900000),

  /** Gas for account verification */
  VERIFICATION_GAS_LIMIT: BigInt(200000),

  /** Pre-verification gas overhead */
  PRE_VERIFICATION_GAS: BigInt(200000),

  /** Gas for paymaster verification (+50%) */
  PAYMASTER_VERIFICATION_GAS_LIMIT: BigInt(675000),

  /** Gas for paymaster post-operation */
  POST_OP_GAS_LIMIT: BigInt(150000),
} as const;

/**
 * UserOperation Gas Limits for Withdraw2 (2:1 merge) Cross-Chain
 * ~75% higher than standard withdrawal due to verifying 2 inputs + cross-chain complexity
 * Total: ~2,362,500 gas
 */
export const WITHDRAW2_CROSS_CHAIN_GAS_LIMITS = {
  /** Gas for executing the main withdrawal call (+75%) */
  CALL_GAS_LIMIT: BigInt(1050000),

  /** Gas for account verification */
  VERIFICATION_GAS_LIMIT: BigInt(200000),

  /** Pre-verification gas overhead */
  PRE_VERIFICATION_GAS: BigInt(200000),

  /** Gas for paymaster verification (+75%) */
  PAYMASTER_VERIFICATION_GAS_LIMIT: BigInt(750000),

  /** Gas for paymaster post-operation */
  POST_OP_GAS_LIMIT: BigInt(150000),
} as const;

/**
 * @deprecated Use FEE_CONFIG instead
 * Kept for backwards compatibility
 */
export const DEPOSIT_FEES = {
  COMPLIANCE_FEE_BPS: FEE_CONFIG.VETTING_FEE_BPS,
  DEFAULT_SOLVER_FEE_BPS: FEE_CONFIG.DEFAULT_SOLVER_FEE_BPS,
} as const;

/**
 * Cross-chain intent timing parameters
 * These values must match the contract configuration
 */
export const INTENT_TIMING = {
  /** Solver must fill within this time (23 hours) */
  FILL_DEADLINE_SECONDS: 82800,

  /** User can claim refund after this time if not filled (24 hours) */
  EXPIRY_SECONDS: 86400,
} as const;

/**
 * @deprecated Use INTENT_TIMING instead
 * Kept for backwards compatibility
 */
export const CROSSCHAIN_DEPOSIT_TIMING = {
  FILL_DEADLINE_SECONDS: INTENT_TIMING.FILL_DEADLINE_SECONDS,
  EXPIRY_SECONDS: INTENT_TIMING.EXPIRY_SECONDS,
} as const;

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

// ============ POOL CHAIN CONTRACTS (Arbitrum Sepolia) ============

/**
 * Main entrypoint contract for same-chain and cross-chain operations
 * Use EntrypointRelayAbi, EntrypointDepositAbi, or EntrypointCrosschainWithdrawalAbi
 * for specific operations instead of a full ABI.
 */
export const SHINOBI_CASH_ENTRYPOINT: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x1960c967e9e7248872E04135513C524556B4323E',
  blockNumber: 239163971,
  abi: [...EntrypointRelayAbi, ...EntrypointDepositAbi],
};

/**
 * ETH privacy pool contract
 * Use PoolScopeAbi for reading the pool scope.
 */
export const SHINOBI_CASH_ETH_POOL: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0xD8d24CfAfC44FEbb6e95635C0D2EF127D5DD925e',
  blockNumber: 239164297,
  abi: PoolScopeAbi,
};

/**
 * Withdrawal input settler for processing withdrawal intents
 */
export const SHINOBI_CASH_WITHDRAWAL_INPUT_SETTLER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: "0x8CC23a5652395217Ba281F1Edf26f6E237F2C6af",
  blockNumber: 239164583,
  abi: []
};

/**
 * Deposit output settler for processing cross-chain deposit fills
 */
export const SHINOBI_CASH_DEPOSIT_OUTPUT_SETTLER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: "0x1861270CC3e1fd6B75634d61d420123724cd1B17",
  blockNumber: 239164779,
  abi: []
};

/**
 * Paymaster for same-chain withdrawals (covers gas via pool funds)
 */
export const SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x2D5F036022D611B84B4bD4843666795168c83f7c',
  blockNumber: 239165983,
  abi: []
};

/**
 * Paymaster for cross-chain withdrawals (covers gas via pool funds)
 */
export const SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x11deb768B97F465C52D91ad3271B1a6147e16fE7',
  blockNumber: 239165996,
  abi: []
};

/**
 * Paymaster for same-chain withdrawals with withdraw2 circuit
 */
export const SHINOBI_CASH_WITHDRAW2_PAYMASTER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x498CB728B62146d324449f7a75E784bd4162a639',
  blockNumber: 239189801,
  abi: []
};

/**
 * Paymaster for cross-chain withdrawals with withdraw2 circuit
 */
export const SHINOBI_CASH_CROSSCHAIN_WITHDRAW2_PAYMASTER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x319743dD9A4E7c17f7d83121327E3A48b7E7Ac2f',
  blockNumber: 239166013,
  abi: []
};

/**
 * Oracle for cross-chain withdrawal fills (Arbitrum Sepolia)
 */
export const SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_FILL_ORACLE: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x4cb20f4415d3666e5d92e261de98fc9b7843d036',
  blockNumber: 0,
  abi: []
};

// ============ VERIFIER CONTRACTS (Arbitrum Sepolia) ============

export const WITHDRAWAL_VERIFIER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x1A6ffA02c307A1856D5ffA9432545012eb929aad',
  blockNumber: 0,
  abi: []
};

export const COMMITMENT_VERIFIER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x020507eAb83152E19c5B8A3234385d4423Ed3185',
  blockNumber: 0,
  abi: []
};

export const CROSSCHAIN_WITHDRAWAL_VERIFIER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x0cd36b4d2ff17F08200F5E07871E8D796de57896',
  blockNumber: 0,
  abi: []
};

export const WITHDRAW2_VERIFIER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x11Ce8937b38487CDeec8C5c4a08792b58dCd41d6',
  blockNumber: 0,
  abi: []
};

export const CROSSCHAIN_WITHDRAW2_VERIFIER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x7706fAa188aee2DC828A0a431121bD8864993AcC',
  blockNumber: 0,
  abi: []
};

// ============ CROSSCHAIN CONTRACTS (Base Sepolia) ============

/**
 * Cross-chain contract deployments per supported chain
 * Includes deposit entrypoints and withdrawal settlers for each chain
 */
export const SHINOBI_CASH_CROSSCHAIN_CONTRACTS = {
  84532: {
    DEPOSIT_ENTRYPOINT: {
      chain: baseSepolia as Chain,
      address: '0x62cacAa2045fC31deFdE0BbbaD0fC47f32792C54',
      blockNumber: 37135360,
      abi: CrosschainDepositEntrypointAbi
    },
    WITHDRAWAL_OUTPUT_SETTLER: {
      chain: baseSepolia as Chain,
      address: "0x0F4b4c45297EEa5adb1DdbE5E94E01Fe7B787a85",
      blockNumber: 37135412,
      abi: []
    },
    DEPOSIT_INPUT_SETTLER: {
      chain: baseSepolia as Chain,
      address: '0x07048A392243b30c9166eb36C5790d9D343e0e58',
      blockNumber: 37135392,
      abi: []
    },
    DEPOSIT_FILL_ORACLE: {
      chain: baseSepolia as Chain,
      address: '0x52Fe5095D9458396e2926d89BC7730DDd2C81404',
      blockNumber: 0,
      abi: []
    },
  }
} as const satisfies Record<typeof SUPPORTED_CROSSCHAIN[number]['id'], CrossChainContracts>;
