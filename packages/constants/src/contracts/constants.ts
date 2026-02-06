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

  /** Minimum cross-chain deposit (0.001 ETH) */
  MIN_CROSSCHAIN_DEPOSIT: BigInt("1000000000000000"), // 0.001 ETH
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
  address: '0x4ea45C13D8993BA019407e092711dD13e498008C',
  blockNumber: 240003515,
  abi: [...EntrypointRelayAbi, ...EntrypointDepositAbi],
};

/**
 * ETH privacy pool contract
 * Use PoolScopeAbi for reading the pool scope.
 */
export const SHINOBI_CASH_ETH_POOL: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x4922F245F26942004603254c18CD3107A1Fd5412',
  blockNumber: 240004086,
  abi: PoolScopeAbi,
};

/**
 * Withdrawal input settler for processing withdrawal intents
 */
export const SHINOBI_CASH_WITHDRAWAL_INPUT_SETTLER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: "0xcDca2d2aef8e4bCb611268CcB0987Cd1357580CA",
  blockNumber: 240004343,
  abi: []
};

/**
 * Deposit output settler for processing cross-chain deposit fills
 */
export const SHINOBI_CASH_DEPOSIT_OUTPUT_SETTLER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: "0x176241f658bdf87A210f842b3e5F0920FD547D62",
  blockNumber: 240004351,
  abi: []
};

/**
 * Paymaster for same-chain withdrawals (covers gas via pool funds)
 */
export const SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x28A356e139e96174A0B3FEA74fc35dD304d5C22f',
  blockNumber: 240004753,
  abi: []
};

/**
 * Paymaster for cross-chain withdrawals (covers gas via pool funds)
 */
export const SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0xE635C5D6413B309b3437DF3Dc14FDEC36Aa232a0',
  blockNumber: 240004774,
  abi: []
};

/**
 * Paymaster for same-chain withdrawals with withdraw2 circuit
 */
export const SHINOBI_CASH_WITHDRAW2_PAYMASTER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0x9E9724ED265a92910e33fD80534B67550c78eF04',
  blockNumber: 240004797,
  abi: []
};

/**
 * Paymaster for cross-chain withdrawals with withdraw2 circuit
 */
export const SHINOBI_CASH_CROSSCHAIN_WITHDRAW2_PAYMASTER: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0xd8db909569A3d0EF0f9b6Be6eF5CcC7c161652EA',
  blockNumber: 240004815,
  abi: []
};

/**
 * Oracle for cross-chain withdrawal fills (Arbitrum Sepolia)
 */
export const SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_FILL_ORACLE: ContractConfig = {
  chain: arbitrumSepolia as Chain,
  address: '0xfc4A359c86aC70f9c11dF86E9a98d70748F7f059',
  blockNumber: 240004334,
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
      address: '0x243BD593d4b999E189Fa49D272256D2e0ca74594',
      blockNumber: 37272720,
      abi: CrosschainDepositEntrypointAbi
    },
    WITHDRAWAL_OUTPUT_SETTLER: {
      chain: baseSepolia as Chain,
      address: "0x9a6065C7E7870e51A8929679e0e9A844C400383f",
      blockNumber: 37272720,
      abi: []
    },
    DEPOSIT_INPUT_SETTLER: {
      chain: baseSepolia as Chain,
      address: '0x5B3CFdb1b3215092D75eE7C2711F486b02541915',
      blockNumber: 37272720,
      abi: []
    },
    DEPOSIT_FILL_ORACLE: {
      chain: baseSepolia as Chain,
      address: '0x52Ca2F0df06B32dC663E66425EDE3dEAA3C1880C',
      blockNumber: 37272720,
      abi: []
    },
  }
} as const satisfies Record<typeof SUPPORTED_CROSSCHAIN[number]['id'], CrossChainContracts>;
