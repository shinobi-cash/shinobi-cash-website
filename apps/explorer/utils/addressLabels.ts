import {
  SHINOBI_CASH_ETH_POOL,
  SHINOBI_CASH_ENTRYPOINT,
  SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_WITHDRAW2_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAW2_PAYMASTER,
  SHINOBI_CASH_WITHDRAWAL_INPUT_SETTLER,
  SHINOBI_CASH_DEPOSIT_OUTPUT_SETTLER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_FILL_ORACLE,
  SHINOBI_CASH_CROSSCHAIN_CONTRACTS,
} from "@shinobi-cash/constants";

interface AddressLabel {
  name: string;
  description?: string;
}

/**
 * Known address labels for the explorer
 */
const ADDRESS_LABELS: Record<string, AddressLabel> = {
  [SHINOBI_CASH_ETH_POOL.address.toLowerCase()]: {
    name: "ETH Pool",
    description: "Shinobi Cash ETH Privacy Pool",
  },
  [SHINOBI_CASH_ENTRYPOINT.address.toLowerCase()]: {
    name: "Entrypoint",
    description: "Main entrypoint for deposits and withdrawals",
  },
  [SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER.address.toLowerCase()]: {
    name: "Relay Paymaster",
    description: "Paymaster for same-chain withdrawals",
  },
  [SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER.address.toLowerCase()]: {
    name: "Crosschain Paymaster",
    description: "Paymaster for cross-chain withdrawals",
  },
  [SHINOBI_CASH_WITHDRAW2_PAYMASTER.address.toLowerCase()]: {
    name: "Withdraw2 Paymaster",
    description: "Paymaster for same-chain 2:1 merge withdrawals",
  },
  [SHINOBI_CASH_CROSSCHAIN_WITHDRAW2_PAYMASTER.address.toLowerCase()]: {
    name: "Crosschain Withdraw2 Paymaster",
    description: "Paymaster for cross-chain 2:1 merge withdrawals",
  },
  [SHINOBI_CASH_WITHDRAWAL_INPUT_SETTLER.address.toLowerCase()]: {
    name: "Withdrawal Settler",
    description: "Processes withdrawal intents",
  },
  [SHINOBI_CASH_DEPOSIT_OUTPUT_SETTLER.address.toLowerCase()]: {
    name: "Deposit Settler",
    description: "Processes cross-chain deposit fills",
  },
  [SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_FILL_ORACLE.address.toLowerCase()]: {
    name: "Withdrawal Oracle",
    description: "Oracle for cross-chain withdrawal fills",
  },
  // Base Sepolia crosschain contracts
  [SHINOBI_CASH_CROSSCHAIN_CONTRACTS[84532].DEPOSIT_ENTRYPOINT.address.toLowerCase()]: {
    name: "Deposit Entrypoint",
    description: "Cross-chain deposit entrypoint on Base",
  },
  [SHINOBI_CASH_CROSSCHAIN_CONTRACTS[84532].WITHDRAWAL_OUTPUT_SETTLER.address.toLowerCase()]: {
    name: "Withdrawal Output Settler",
    description: "Settles cross-chain withdrawal outputs on Base",
  },
  [SHINOBI_CASH_CROSSCHAIN_CONTRACTS[84532].DEPOSIT_INPUT_SETTLER.address.toLowerCase()]: {
    name: "Deposit Input Settler",
    description: "Settles cross-chain deposit inputs on Base",
  },
  [SHINOBI_CASH_CROSSCHAIN_CONTRACTS[84532].DEPOSIT_FILL_ORACLE.address.toLowerCase()]: {
    name: "Deposit Oracle",
    description: "Oracle for cross-chain deposit fills",
  },
};

/**
 * Get label for an address if known
 */
export function getAddressLabel(address: string): AddressLabel | null {
  return ADDRESS_LABELS[address.toLowerCase()] ?? null;
}

/**
 * Check if an address is a known contract
 */
export function isKnownAddress(address: string): boolean {
  return address.toLowerCase() in ADDRESS_LABELS;
}
