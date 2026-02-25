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
  InputSettlerRefundAbi,
  InputSettlerOrderStatusAbi,
} from "../abi.js";
import { POOL_CHAIN, BASE_SEPOLIA, SUPPORTED_CROSSCHAIN, type ShinobiChain } from "../network/index.js";

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
  /** Minimum same-chain deposit to pool (0.001 ETH) */
  MIN_POOL_DEPOSIT: BigInt("1000000000000000"), // 0.001 ETH

  /** Minimum cross-chain deposit (0.001 ETH) */
  MIN_CROSSCHAIN_DEPOSIT: BigInt("1000000000000000"), // 0.001 ETH
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
  PRE_VERIFICATION_GAS: BigInt(200000),

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
  PRE_VERIFICATION_GAS: BigInt(200000),

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
 * UserOperation Gas Limits for Withdrawal Refund (via crosschain paymaster)
 * Refund is simpler than withdrawal — no ZK proof verification.
 * Based on contract: 350k call gas + 200k verification gas.
 */
export const WITHDRAWAL_REFUND_GAS_LIMITS = {
  /** Gas for executing the refund call */
  CALL_GAS_LIMIT: BigInt(350000),

  /** Gas for account verification */
  VERIFICATION_GAS_LIMIT: BigInt(200000),

  /** Pre-verification gas overhead */
  PRE_VERIFICATION_GAS: BigInt(200000),

  /** Gas for paymaster verification */
  PAYMASTER_VERIFICATION_GAS_LIMIT: BigInt(350000),

  /** Gas for paymaster post-operation */
  POST_OP_GAS_LIMIT: BigInt(100000),
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
 * Fallback defaults for crosschain deposit (used before contract fetch)
 * These should match the typical contract configuration
 */
export const CROSSCHAIN_DEPOSIT_FALLBACK = {
  SOLVER_FEE_BPS: 500, // 5%
  FILL_DEADLINE_SECONDS: 1800, // 30 min
  EXPIRY_SECONDS: 86400, // 24 hours
  MAX_SOLVER_FEE_BPS: 1000, // 10%
} as const;

// ============ TYPE DEFINITIONS ============

type ContractConfig = {
  chain: ShinobiChain;
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
  chain: POOL_CHAIN,
  address: "0xa6f7fdF6d62f3a56B4469046C7927f4cb0c67595",
  blockNumber: 243658592,
  abi: [...EntrypointRelayAbi, ...EntrypointDepositAbi],
};

/**
 * ETH privacy pool contract
 * Use PoolScopeAbi for reading the pool scope.
 */
export const SHINOBI_CASH_ETH_POOL: ContractConfig = {
  chain: POOL_CHAIN,
  address: "0xF400070885d773ef29C1e7c04eDffd637C22584B",
  blockNumber: 243659038,
  abi: PoolScopeAbi,
};

/**
 * Withdrawal input settler for processing withdrawal intents
 */
export const SHINOBI_CASH_WITHDRAWAL_INPUT_SETTLER: ContractConfig = {
  chain: POOL_CHAIN,
  address: "0x4385eebaC4Eab0bc93E6D43270908da07e4b3178",
  blockNumber: 243659319,
  abi: [...InputSettlerRefundAbi, ...InputSettlerOrderStatusAbi],
};

/**
 * Deposit output settler for processing cross-chain deposit fills
 */
export const SHINOBI_CASH_DEPOSIT_OUTPUT_SETTLER: ContractConfig = {
  chain: POOL_CHAIN,
  address: "0x843B07421385282EEE4FE1135DD1A63c1184aD71",
  blockNumber: 243659325,
  abi: [],
};

/**
 * Paymaster for same-chain withdrawals (covers gas via pool funds)
 */
export const SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER: ContractConfig = {
  chain: POOL_CHAIN,
  address: "0x52Ac5611230658aAf42e183D28Fab191C0bdff98",
  blockNumber: 243659684,
  abi: [],
};

/**
 * Paymaster for cross-chain withdrawals (covers gas via pool funds)
 */
export const SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER: ContractConfig = {
  chain: POOL_CHAIN,
  address: "0x522d4Bb38F89D793D2996096592c01CB053eD3a5",
  blockNumber: 243659706,
  abi: [],
};

/**
 * Paymaster for same-chain withdrawals with withdraw2 circuit
 */
export const SHINOBI_CASH_WITHDRAW2_PAYMASTER: ContractConfig = {
  chain: POOL_CHAIN,
  address: "0x4E4a1E964baDCBB6Be5f14b324238C24E69dD56D",
  blockNumber: 243659727,
  abi: [],
};

/**
 * Paymaster for cross-chain withdrawals with withdraw2 circuit
 */
export const SHINOBI_CASH_CROSSCHAIN_WITHDRAW2_PAYMASTER: ContractConfig = {
  chain: POOL_CHAIN,
  address: "0x82eaeF17B861Bc7E3cBeC50Ce1fF39B58453ef27",
  blockNumber: 243659748,
  abi: [],
};

/**
 * Hyperlane Oracle for cross-chain intent proofs (Arbitrum Sepolia)
 */
export const SHINOBI_CASH_HYPERLANE_ORACLE: ContractConfig = {
  chain: POOL_CHAIN,
  address: "0x246e0E2e416a9B06Cd806292f6a4eCb269cfA7CA",
  blockNumber: 243659310,
  abi: [],
};

// ============ VERIFIER CONTRACTS (Arbitrum Sepolia) ============

export const WITHDRAWAL_VERIFIER: ContractConfig = {
  chain: POOL_CHAIN,
  address: "0x1A6ffA02c307A1856D5ffA9432545012eb929aad",
  blockNumber: 0,
  abi: [],
};

export const COMMITMENT_VERIFIER: ContractConfig = {
  chain: POOL_CHAIN,
  address: "0x020507eAb83152E19c5B8A3234385d4423Ed3185",
  blockNumber: 0,
  abi: [],
};

export const CROSSCHAIN_WITHDRAWAL_VERIFIER: ContractConfig = {
  chain: POOL_CHAIN,
  address: "0x4551bb04e9218b38902E6a489906BAB4816e01b2",
  blockNumber: 243658276,
  abi: [],
};

export const WITHDRAW2_VERIFIER: ContractConfig = {
  chain: POOL_CHAIN,
  address: "0x11Ce8937b38487CDeec8C5c4a08792b58dCd41d6",
  blockNumber: 0,
  abi: [],
};

export const CROSSCHAIN_WITHDRAW2_VERIFIER: ContractConfig = {
  chain: POOL_CHAIN,
  address: "0xe88911836140a2Aa2eD2560cb845003487137cB7",
  blockNumber: 243658282,
  abi: [],
};

// ============ CROSSCHAIN CONTRACTS (Base Sepolia) ============

/**
 * Cross-chain contract deployments per supported chain
 * Includes deposit entrypoints and withdrawal settlers for each chain
 */
export const SHINOBI_CASH_CROSSCHAIN_CONTRACTS = {
  84532: {
    DEPOSIT_ENTRYPOINT: {
      chain: BASE_SEPOLIA,
      address: "0x655973cd82614e7e37188d1e5b893973339842f1",
      blockNumber: 37835985,
      abi: CrosschainDepositEntrypointAbi,
    },
    WITHDRAWAL_OUTPUT_SETTLER: {
      chain: BASE_SEPOLIA,
      address: "0x3c10FcD909B932AFb183b03377D1aFdc9F097931",
      blockNumber: 37835985,
      abi: [],
    },
    DEPOSIT_INPUT_SETTLER: {
      chain: BASE_SEPOLIA,
      address: "0xCd7722864E24bF241272dF1a7237F22bCb772db2",
      blockNumber: 37835985,
      abi: [...InputSettlerRefundAbi, ...InputSettlerOrderStatusAbi],
    },
    DEPOSIT_FILL_ORACLE: {
      chain: BASE_SEPOLIA,
      address: "0x9bd18887d5a37a5851aEB89E0e68E665D628Dd7B",
      blockNumber: 37835985,
      abi: [],
    },
  },
} as const satisfies Record<(typeof SUPPORTED_CROSSCHAIN)[number]["id"], CrossChainContracts>;
