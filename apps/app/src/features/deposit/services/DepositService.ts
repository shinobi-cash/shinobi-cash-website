/**
 * Deposit Service
 *
 * Migrated to use @shinobi-cash/core SDK
 * Original implementation backed up to DepositService.ts.backup
 * Migrated: 2025-01-06
 */

import { DepositService } from "@shinobi-cash/core";
import { DepositStorageProviderAdapter } from "./adapters/DepositStorageProviderAdapter";

/**
 * Create singleton service instance with storage adapter
 */
export const depositStorageProvider = new DepositStorageProviderAdapter();
export const depositService = new DepositService(depositStorageProvider);

// Legacy type for compatibility (deprecated - hooks should migrate to DepositCommitmentResult from @shinobi-cash/core)
export interface CashNoteData {
  poolAddress: string;
  depositIndex: number;
  changeIndex: number;
  precommitment: bigint;
}

// Export singleton as default
export default depositService;
