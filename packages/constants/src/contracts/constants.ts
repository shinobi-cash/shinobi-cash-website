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
  address: '0x533795ccca8Eb0a4D10e5d006dcC7D475cC00b29',
  blockNumber: 239166004,
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
