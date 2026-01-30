/**
 * Note Discovery Primitives - Pure Cryptographic Operations
 *
 * This module provides atomic primitives for discovering notes through
 * cryptographic matching of deposits and withdrawals. All functions are
 * pure (no side effects, no I/O) and framework-agnostic.
 *
 * Applications compose these primitives with their storage and pagination logic.
 */

import type { Activity } from '@shinobi-cash/data';
import type { Note, NoteChain, DepositNote, ChangeNote } from '../types/index.js';
import {
  deriveChangeNullifier,
  deriveDepositNullifier,
} from './noteDerivation.js';
import { poseidon1 } from 'poseidon-lite/poseidon1';

/**
 * Activity context for optimized chain operations
 *
 * Pre-built index maps to avoid O(n) lookups on every operation.
 * Build once per page, reuse for all chain extensions.
 */
export type ActivityContext = {
  withdrawalsByNullifier: Map<string, Activity>;
};

/**
 * Build activity index maps for efficient withdrawal matching
 *
 * Creates lookup maps to avoid O(n²) scanning when matching withdrawals.
 * This is a performance optimization helper for chain building/extension.
 *
 * @param activities - Activities to index
 * @returns Activity context with indexed lookups
 *
 * @example
 * ```typescript
 * const context = buildActivityIndexMaps(activities);
 * const chain1 = extendNoteChain(chain1, activities, accountKey, poolAddress, context);
 * const chain2 = extendNoteChain(chain2, activities, accountKey, poolAddress, context);
 * ```
 */
export function buildActivityIndexMaps(activities: Activity[]): ActivityContext {
  const withdrawalsByNullifier = new Map<string, Activity>();

  for (const activity of activities) {
    if (
      (activity.type === 'WITHDRAWAL' || activity.type === 'CROSSCHAIN_WITHDRAWAL') &&
      activity.spentNullifier
    ) {
      withdrawalsByNullifier.set(activity.spentNullifier, activity);
    }
  }

  return { withdrawalsByNullifier };
}

/**
 * Build initial note chain from a deposit activity
 *
 * Pure function that creates a note chain starting from a deposit,
 * optionally extending it with withdrawals from the provided activities.
 *
 * @param depositActivity - The deposit activity to build chain from
 * @param depositIndex - Deposit index for the deposit
 * @param accountKey - User's account key
 * @param poolAddress - Pool contract address
 * @param activitiesAfterDeposit - Activities that occurred after the deposit
 * @param context - Optional pre-built activity index maps for performance
 * @returns New note chain starting with deposit note
 *
 * @example
 * ```typescript
 * const chain = buildNoteChain(
 *   depositActivity,
 *   0,
 *   accountKey,
 *   poolAddress,
 *   activitiesAfterDeposit
 * );
 * // chain = [depositNote, changeNote?, changeNote?, ...]
 * ```
 */
export function buildNoteChain(
  depositActivity: Activity,
  depositIndex: number,
  accountKey: bigint,
  poolAddress: string,
  activitiesAfterDeposit: Activity[],
  context?: ActivityContext,
): NoteChain {
  // Require precommitmentHash from indexer (fail fast if missing)
  if (!depositActivity.precommitmentHash) {
    throw new Error(
      `Indexer must provide precommitmentHash for deposit at index ${depositIndex}. ` +
      `This is required for O(1) aspStatus lookups during sync.`
    );
  }

  const originChainId = depositActivity.originChainId.toString();
  const destinationChainId = (depositActivity.destinationChainId || depositActivity.originChainId).toString();

  // Determine cross-chain status from activity type (more reliable than comparing chain IDs
  // since destinationChainId may not be set for pending cross-chain deposits)
  const isCrossChain = depositActivity.type === 'CROSSCHAIN_DEPOSIT' ||
    depositActivity.type === 'CROSSCHAIN_DEPOSIT_PENDING' ||
    originChainId !== destinationChainId;

  const depositNote: DepositNote = {
    // Note identity
    poolAddress,
    depositIndex,
    changeIndex: 0,
    noteType: 'deposit',

    // Note value
    amount: depositActivity.amount ? depositActivity.amount.toString() : '0',

    // Note location
    originTransactionHash: depositActivity.originTransactionHash,
    destinationTransactionHash: depositActivity.destinationTransactionHash || depositActivity.originTransactionHash,
    originChainId,
    destinationChainId,
    blockNumber: depositActivity.blockNumber.toString(),
    timestamp: depositActivity.timestamp.toString(),

    // Note state
    status: 'unspent',
    aspStatus: depositActivity.aspStatus,
    label: depositActivity.label || `Pending Deposit #${depositIndex}`,
    precommitmentHash: depositActivity.precommitmentHash,

    // Cross-chain context
    isCrossChain,
    orderId: depositActivity.orderId ?? undefined,
    intentStatus: isCrossChain ? (depositActivity.intentStatus ?? 'pending') : undefined,
    fillDeadline: depositActivity.fillDeadline?.toString(),
    expires: depositActivity.expires?.toString(),

    // Nested activity data (transaction metadata)
    activityData: {
      // Fees
      originalAmount: depositActivity.originalAmount?.toString(),
      vettingFeeAmount: depositActivity.vettingFeeAmount?.toString(),
      solverFeeAmount: depositActivity.solverFeeAmount?.toString(),

      // Actors
      user: depositActivity.user,
      solver: depositActivity.solver,
      vettingFeeRecipient: depositActivity.vettingFeeRecipient,

      // Crypto
      commitment: depositActivity.commitment,
    },
  };

  const chain: NoteChain = [depositNote];

  // Extend chain with any withdrawals found in provided activities
  return extendNoteChain(chain, activitiesAfterDeposit, accountKey, poolAddress, context);
}

/**
 * Extend note chain by finding and appending withdrawals
 *
 * Pure function that returns a NEW chain with withdrawals appended.
 * Does NOT mutate the input chain.
 *
 * @param chain - Existing note chain to extend
 * @param activities - Activities to search for withdrawals
 * @param accountKey - User's account key
 * @param poolAddress - Pool contract address
 * @param context - Optional pre-built activity index maps for performance
 * @returns NEW extended chain (original chain is not modified)
 *
 * @example
 * ```typescript
 * const originalChain = [depositNote];
 * const extendedChain = extendNoteChain(
 *   originalChain,
 *   newActivities,
 *   accountKey,
 *   poolAddress
 * );
 * // originalChain unchanged, extendedChain = [depositNote, changeNote, ...]
 *
 * // Performance optimization: pre-build maps for multiple calls
 * const context = buildActivityIndexMaps(activities);
 * const chain1 = extendNoteChain(chain1, activities, accountKey, poolAddress, context);
 * const chain2 = extendNoteChain(chain2, activities, accountKey, poolAddress, context);
 * ```
 */
export function extendNoteChain(
  chain: NoteChain,
  activities: Activity[],
  accountKey: bigint,
  poolAddress: string,
  context?: ActivityContext,
): NoteChain {
  if (chain.length === 0) return chain;

  const lastNote = chain[chain.length - 1]!;

  // Skip extending if amount is null/undefined (pending deposits)
  if (lastNote.amount === null || lastNote.amount === undefined) {
    return chain;
  }

  // Skip if already spent with no remaining amount
  if (lastNote.status === 'spent' && BigInt(lastNote.amount) <= 0n) {
    return chain;
  }

  // Use provided context or build activity index for efficient lookups
  const { withdrawalsByNullifier } = context || buildActivityIndexMaps(activities);

  // Create new chain with existing notes (shallow copy)
  const newChain = [...chain];
  let remaining = BigInt(lastNote.amount);
  let changeIndex = lastNote.changeIndex === 0 ? 1 : lastNote.changeIndex + 1;

  // Derive current nullifier
  let currentNullifier: bigint;
  if (lastNote.changeIndex === 0) {
    currentNullifier = deriveDepositNullifier(accountKey, poolAddress, chain[0]!.depositIndex);
  } else {
    currentNullifier = deriveChangeNullifier(accountKey, poolAddress, chain[0]!.depositIndex, lastNote.changeIndex);
  }

  // Extend chain with withdrawals
  while (true) {
    const nullifierHash = poseidon1([currentNullifier]).toString();
    const withdrawal = withdrawalsByNullifier.get(nullifierHash);

    if (!withdrawal || !withdrawal.newCommitment || withdrawal.amount == null) break;

    // Mark previous note as spent (create new object to maintain immutability)
    const prevNote = newChain[newChain.length - 1]!;
    newChain[newChain.length - 1] = { ...prevNote, status: 'spent' as const };

    remaining -= BigInt(withdrawal.amount);

    const changeNote: ChangeNote = {
      // Note identity
      poolAddress: chain[0]!.poolAddress,
      depositIndex: chain[0]!.depositIndex,
      changeIndex,
      noteType: 'change',

      // Note value (remaining balance after withdrawal)
      amount: remaining.toString(),

      // Note location
      originTransactionHash: withdrawal.originTransactionHash,
      destinationTransactionHash: withdrawal.destinationTransactionHash || withdrawal.originTransactionHash,
      originChainId: withdrawal.originChainId.toString(),
      destinationChainId: (withdrawal.destinationChainId || withdrawal.originChainId).toString(),
      blockNumber: withdrawal.blockNumber.toString(),
      timestamp: withdrawal.timestamp.toString(),

      // Note state (inherits ASP status from deposit)
      status: remaining > 0n ? 'unspent' : 'spent',
      aspStatus: chain[0]!.aspStatus,
      label: chain[0]!.label,

      // Cross-chain context
      refundCommitment: withdrawal.refundCommitment,
      isCrossChain: chain[0]!.isCrossChain,
      orderId: chain[0]!.orderId,
      intentStatus: chain[0]!.isCrossChain ? (withdrawal.intentStatus ?? 'filled') : undefined,

      // Nested activity data (withdrawal transaction metadata)
      activityData: {
        // Fees
        originalAmount: withdrawal.originalAmount?.toString(),
        vettingFeeAmount: withdrawal.vettingFeeAmount?.toString(),
        relayFeeAmount: withdrawal.relayFeeAmount?.toString(),
        solverFeeAmount: withdrawal.solverFeeAmount?.toString(),
        paymasterFeeRefund: withdrawal.paymasterFeeRefund?.toString(),

        // Actors
        recipient: withdrawal.recipient,
        relayer: withdrawal.relayer,
        solver: withdrawal.solver,

        // Crypto
        commitment: withdrawal.commitment,
        spentNullifier: withdrawal.spentNullifier,
        newCommitment: withdrawal.newCommitment,

        // Metadata
        isSponsored: withdrawal.isSponsored,
      },
    };

    newChain.push(changeNote);

    if (remaining <= 0n) break;

    currentNullifier = deriveChangeNullifier(accountKey, poolAddress, chain[0]!.depositIndex, changeIndex);
    changeIndex++;
  }

  return newChain;
}
