/**
 * Deposit Repository
 * Handles deposit index tracking and composes core crypto primitives with storage
 */

import {
  deriveDepositNullifier,
  deriveDepositSecret,
  derivePrecommitment,
  type DepositCommitmentResult,
} from "@shinobi-cash/core";
import type { NotesRepository } from "./NotesRepository";

export class DepositRepository {
  constructor(private notesRepo: NotesRepository) {}

  /**
   * Get next available deposit index for user
   * Reads from note storage to determine the next index
   */
  async getNextDepositIndex(publicKey: string, poolAddress: string): Promise<number> {
    const cached = await this.notesRepo.getCachedNotes(publicKey, poolAddress);
    return cached?.lastUsedIndex !== undefined ? cached.lastUsedIndex + 1 : 0;
  }

  /**
   * Generate deposit commitment (composes core crypto primitives + storage)
   *
   * This method demonstrates app-layer composition:
   * 1. Fetches next deposit index from storage (app responsibility)
   * 2. Calls core crypto primitives to derive commitment (core responsibility)
   * 3. Returns structured result (app decides format)
   *
   * @param accountKey - User's account key
   * @param publicKey - User's public key
   * @param poolAddress - Pool contract address
   * @returns Deposit commitment with cryptographic data
   */
  async generateDepositCommitment(
    accountKey: bigint,
    publicKey: string,
    poolAddress: string
  ): Promise<DepositCommitmentResult> {
    // 1. Get next deposit index from storage (app orchestration)
    const depositIndex = await this.getNextDepositIndex(publicKey, poolAddress);

    // 2. Compose core crypto primitives (app decides composition)
    const nullifier = deriveDepositNullifier(accountKey, poolAddress, depositIndex);
    const secret = deriveDepositSecret(accountKey, poolAddress, depositIndex);
    const precommitment = derivePrecommitment(nullifier, secret);

    // 3. Return structured result (app decides format)
    return {
      precommitment: `0x${precommitment.toString(16)}`,
      depositIndex,
      poolAddress,
      nullifier,
      secret,
    };
  }
}
