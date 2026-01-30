import {
  SHINOBI_CASH_ETH_POOL,
  SHINOBI_CASH_ENTRYPOINT,
  SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_WITHDRAWAL_INPUT_SETTLER,
  SHINOBI_CASH_DEPOSIT_OUTPUT_SETTLER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_FILL_ORACLE,
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
