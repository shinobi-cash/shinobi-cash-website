/**
 * Deposit Storage Provider Adapter
 * Bridges refactored storage to deposit service interface
 */

import { storageManager } from "@/lib/storage";
import type { IDepositStorageProvider } from "@shinobi-cash/core";

export class DepositStorageProviderAdapter implements IDepositStorageProvider {
  async getNextDepositIndex(publicKey: string, poolAddress: string): Promise<number> {
    return storageManager.getNextDepositIndex(publicKey, poolAddress);
  }

  async updateLastUsedDepositIndex(
    publicKey: string,
    poolAddress: string,
    depositIndex: number
  ): Promise<void> {
    return storageManager.updateLastUsedDepositIndex(publicKey, poolAddress, depositIndex);
  }
}
