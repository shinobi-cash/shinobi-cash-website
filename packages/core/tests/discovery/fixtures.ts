/**
 * Shared test fixtures for discovery tests
 */

import type { Activity } from '@shinobi-cash/data';
import type { Note, DepositNote, ChangeNote, DepositIntentNote, WithdrawalIntentNote, WithdrawalRefundedNote, RagequitNote, MergedNote, NoteTree } from '../../src/discovery/types.js';
import { generateSerialNumber } from '../../src/discovery/types.js';
import { deriveDepositPrecommitment, deriveAndHashNullifier } from '../../src/discovery/nullifier-utils.js';
import { createNoteTree, addChild } from '../../src/discovery/tree-utils.js';

// ============================================================================
// Test Constants
// ============================================================================

export const TEST_POOL_ADDRESS = '0x1234567890123456789012345678901234567890';
export const TEST_ACCOUNT_KEY = 12345678901234567890n;
export const TEST_USER_ADDRESS = '0xuser1234567890123456789012345678901234567';
export const TEST_RECIPIENT_ADDRESS = '0xrecipient12345678901234567890123456789';
export const TEST_CHAIN_ID = '421614';

// ============================================================================
// Activity Factories
// ============================================================================

let activityCounter = 0;

export function createMockDepositActivity(
  depositIndex: number,
  amount: string | bigint,
  overrides: Partial<Activity> = {},
): Activity {
  const precommitmentHash = deriveDepositPrecommitment(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, depositIndex);

  return {
    id: `deposit-${depositIndex}-${++activityCounter}`,
    type: 'DEPOSIT',
    poolId: TEST_POOL_ADDRESS,
    user: TEST_USER_ADDRESS,
    amount: BigInt(amount),
    originalAmount: BigInt(amount),
    blockNumber: BigInt(1000 + depositIndex),
    timestamp: BigInt(Date.now()),
    originTransactionHash: `0xtx-deposit-${depositIndex}`,
    originChainId: BigInt(421614),
    aspStatus: 'approved',
    precommitmentHash,
    label: BigInt(depositIndex + 1000),
    ...overrides,
  } as Activity;
}

export function createMockCrossChainDepositActivity(
  depositIndex: number,
  amount: string | bigint,
  overrides: Partial<Activity> = {},
): Activity {
  return createMockDepositActivity(depositIndex, amount, {
    type: 'CROSSCHAIN_DEPOSIT',
    destinationChainId: BigInt(84532), // Base Sepolia (pool chain)
    destinationTransactionHash: `0xtx-fill-${depositIndex}`, // Fill tx on destination chain
    intentStatus: 'filled',
    orderId: `order-${depositIndex}`,
    ...overrides,
  });
}

export function createMockPendingCrossChainDepositActivity(
  depositIndex: number,
  amount: string | bigint,
  overrides: Partial<Activity> = {},
): Activity {
  return createMockDepositActivity(depositIndex, amount, {
    type: 'CROSSCHAIN_DEPOSIT_PENDING',
    destinationChainId: BigInt(84532), // Base Sepolia (pool chain)
    intentStatus: 'pending',
    orderId: `order-pending-${depositIndex}`,
    fillDeadline: BigInt(Date.now() + 3600000), // 1 hour from now
    expires: BigInt(Date.now() + 7200000), // 2 hours from now
    ...overrides,
  });
}

export function createMock1x1WithdrawalActivity(
  depositIndex: number,
  changeIndex: number,
  withdrawnAmount: string | bigint,
  overrides: Partial<Activity> = {},
): Activity {
  const spentNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, depositIndex, changeIndex);

  return {
    id: `withdrawal-${depositIndex}-${changeIndex}-${++activityCounter}`,
    type: 'WITHDRAWAL',
    poolId: TEST_POOL_ADDRESS,
    user: TEST_USER_ADDRESS,
    recipient: TEST_RECIPIENT_ADDRESS,
    amount: BigInt(withdrawnAmount),
    blockNumber: BigInt(2000 + depositIndex * 10 + changeIndex),
    timestamp: BigInt(Date.now()),
    originTransactionHash: `0xtx-withdrawal-${depositIndex}-${changeIndex}`,
    originChainId: BigInt(421614),
    aspStatus: 'approved',
    spentNullifier,
    newCommitment: `0xcommitment-${depositIndex}-${changeIndex + 1}`,
    ...overrides,
  } as Activity;
}

export function createMockCrossChainWithdrawalActivity(
  depositIndex: number,
  changeIndex: number,
  withdrawnAmount: string | bigint,
  overrides: Partial<Activity> = {},
): Activity {
  return createMock1x1WithdrawalActivity(depositIndex, changeIndex, withdrawnAmount, {
    type: 'CROSSCHAIN_WITHDRAWAL_PENDING',
    destinationChainId: BigInt(84532),
    intentStatus: 'pending',
    orderId: `order-withdraw-${depositIndex}-${changeIndex}`,
    refundCommitment: `0xrefund-${depositIndex}-${changeIndex}`,
    fillDeadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
    expires: BigInt(Math.floor(Date.now() / 1000) + 86400), // 24 hours from now
    ...overrides,
  });
}

export function createMockWithdraw2Activity(
  depositIndex0: number,
  changeIndex0: number,
  depositIndex1: number,
  changeIndex1: number,
  withdrawnAmount: string | bigint,
  overrides: Partial<Activity> = {},
): Activity {
  const spentNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, depositIndex0, changeIndex0);
  const spentNullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, depositIndex1, changeIndex1);

  return {
    id: `withdraw2-${depositIndex0}-${depositIndex1}-${++activityCounter}`,
    type: 'WITHDRAW2',
    poolId: TEST_POOL_ADDRESS,
    user: TEST_USER_ADDRESS,
    recipient: TEST_RECIPIENT_ADDRESS,
    amount: BigInt(withdrawnAmount),
    blockNumber: BigInt(3000 + depositIndex0 * 10 + depositIndex1),
    timestamp: BigInt(Date.now()),
    originTransactionHash: `0xtx-withdraw2-${depositIndex0}-${depositIndex1}`,
    originChainId: BigInt(421614),
    aspStatus: 'approved',
    spentNullifier,
    spentNullifier1,
    newCommitment: `0xcommitment-${depositIndex0}-merged`,
    ...overrides,
  } as Activity;
}

export function createMockRagequitActivity(
  depositIndex: number,
  changeIndex: number,
  commitment: string,
  overrides: Partial<Activity> = {},
): Activity {
  return {
    id: `ragequit-${depositIndex}-${changeIndex}-${++activityCounter}`,
    type: 'RAGEQUIT',
    poolId: TEST_POOL_ADDRESS,
    user: TEST_USER_ADDRESS,
    blockNumber: BigInt(4000 + depositIndex * 10 + changeIndex),
    timestamp: BigInt(Date.now()),
    originTransactionHash: `0xtx-ragequit-${depositIndex}-${changeIndex}`,
    originChainId: BigInt(421614),
    commitment,
    ...overrides,
  } as Activity;
}

// ============================================================================
// Note Factories
// ============================================================================

export function createMockDepositNote(
  depositIndex: number,
  amount: string | bigint,
  overrides: Partial<DepositNote> = {},
): DepositNote {
  const precommitmentHash = deriveDepositPrecommitment(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, depositIndex);

  return {
    noteType: 'deposit',
    serialNumber: generateSerialNumber(TEST_CHAIN_ID, depositIndex, 0, false),
    poolAddress: TEST_POOL_ADDRESS,
    depositIndex,
    changeIndex: 0,
    amount: amount.toString(),
    label: (depositIndex + 1000).toString(),
    status: 'unspent',
    originBlockNumber: (1000 + depositIndex).toString(),
    originTimestamp: Date.now().toString(),
    originChainId: TEST_CHAIN_ID,
    originTransactionHash: `0xtx-deposit-${depositIndex}`,
    aspStatus: 'approved',
    precommitmentHash,
    activityData: {},
    ...overrides,
  };
}

export function createMockChangeNote(
  depositIndex: number,
  changeIndex: number,
  amount: string | bigint,
  overrides: Partial<ChangeNote> = {},
): ChangeNote {
  return {
    noteType: 'change',
    serialNumber: generateSerialNumber(TEST_CHAIN_ID, depositIndex, changeIndex, false),
    poolAddress: TEST_POOL_ADDRESS,
    depositIndex,
    changeIndex,
    amount: amount.toString(),
    label: (depositIndex + 1000).toString(),
    status: 'unspent',
    originBlockNumber: (2000 + depositIndex * 10 + changeIndex).toString(),
    originTimestamp: Date.now().toString(),
    originChainId: TEST_CHAIN_ID,
    originTransactionHash: `0xtx-withdrawal-${depositIndex}-${changeIndex}`,
    aspStatus: 'approved',
    mergedFrom: {},
    activityData: {},
    ...overrides,
  };
}

export function createMockWithdrawalIntentNote(
  depositIndex: number,
  changeIndex: number,
  amount: string | bigint,
  overrides: Partial<WithdrawalIntentNote> = {},
): WithdrawalIntentNote {
  return {
    noteType: 'withdrawalIntent',
    serialNumber: generateSerialNumber(TEST_CHAIN_ID, depositIndex, changeIndex, true),
    poolAddress: TEST_POOL_ADDRESS,
    depositIndex,
    changeIndex,
    amount: amount.toString(),
    originBlockNumber: (2000 + depositIndex * 10 + changeIndex).toString(),
    originTimestamp: Date.now().toString(),
    originChainId: TEST_CHAIN_ID,
    originTransactionHash: `0xtx-crosschain-${depositIndex}-${changeIndex}`,
    destinationChainId: '84532',
    orderId: `order-${depositIndex}-${changeIndex}`,
    fillDeadline: (Math.floor(Date.now() / 1000) + 3600).toString(),
    expires: (Math.floor(Date.now() / 1000) + 86400).toString(),
    refundCommitment: `0xrefund-${depositIndex}-${changeIndex}`,
    activityData: {},
    ...overrides,
  };
}

export function createMockDepositIntentNote(
  depositIndex: number,
  amount: string | bigint,
  overrides: Partial<DepositIntentNote> = {},
): DepositIntentNote {
  const chainId = '84532'; // Base Sepolia (origin)
  return {
    noteType: 'depositIntent',
    serialNumber: generateSerialNumber(chainId, depositIndex, 0, true),
    poolAddress: TEST_POOL_ADDRESS,
    depositIndex,
    changeIndex: 0,
    amount: amount.toString(),
    originBlockNumber: (1000 + depositIndex).toString(),
    originTimestamp: Date.now().toString(),
    originChainId: chainId,
    originTransactionHash: `0xtx-deposit-intent-${depositIndex}`,
    destinationChainId: '421614', // Arbitrum Sepolia (pool chain)
    orderId: `order-deposit-${depositIndex}`,
    fillDeadline: (Math.floor(Date.now() / 1000) + 3600).toString(),
    expires: (Math.floor(Date.now() / 1000) + 86400).toString(),
    activityData: {},
    ...overrides,
  };
}

export function createMockWithdrawalRefundedNote(
  depositIndex: number,
  changeIndex: number,
  amount: string | bigint,
  overrides: Partial<WithdrawalRefundedNote> = {},
): WithdrawalRefundedNote {
  return {
    noteType: 'withdrawalRefunded',
    serialNumber: generateSerialNumber(TEST_CHAIN_ID, depositIndex, changeIndex, false),
    poolAddress: TEST_POOL_ADDRESS,
    depositIndex,
    changeIndex,
    amount: amount.toString(),
    label: (depositIndex + 1000).toString(),
    status: 'unspent',
    originBlockNumber: (5000 + depositIndex * 10 + changeIndex).toString(),
    originTimestamp: Date.now().toString(),
    originChainId: TEST_CHAIN_ID,
    originTransactionHash: `0xtx-refund-${depositIndex}-${changeIndex}`,
    aspStatus: 'approved',
    refundCommitment: `0xrefund-${depositIndex}-${changeIndex}`,
    activityData: {},
    ...overrides,
  };
}

export function createMockRagequitNote(
  depositIndex: number,
  changeIndex: number,
  amount: string | bigint,
  overrides: Partial<RagequitNote> = {},
): RagequitNote {
  return {
    noteType: 'ragequit',
    serialNumber: generateSerialNumber(TEST_CHAIN_ID, depositIndex, changeIndex, false),
    poolAddress: TEST_POOL_ADDRESS,
    depositIndex,
    changeIndex,
    amount: amount.toString(),
    originBlockNumber: (4000 + depositIndex * 10 + changeIndex).toString(),
    originTimestamp: Date.now().toString(),
    originChainId: TEST_CHAIN_ID,
    originTransactionHash: `0xtx-ragequit-${depositIndex}-${changeIndex}`,
    recipient: TEST_USER_ADDRESS,
    activityData: {},
    ...overrides,
  };
}

export function createMockMergedNote(
  depositIndex: number,
  changeIndex: number,
  amount: string | bigint,
  mergedIntoSerialNumber: string,
  overrides: Partial<MergedNote> = {},
): MergedNote {
  return {
    noteType: 'merged',
    serialNumber: generateSerialNumber(TEST_CHAIN_ID, depositIndex, changeIndex, false),
    poolAddress: TEST_POOL_ADDRESS,
    depositIndex,
    changeIndex,
    amount: amount.toString(),
    originBlockNumber: (3000 + depositIndex * 10 + changeIndex).toString(),
    originTimestamp: Date.now().toString(),
    originChainId: TEST_CHAIN_ID,
    originTransactionHash: `0xtx-merged-${depositIndex}-${changeIndex}`,
    mergedIntoSerialNumber,
    activityData: {},
    ...overrides,
  };
}

// ============================================================================
// Tree Factories
// ============================================================================

/**
 * Create a NoteTree with just a deposit note at the root
 */
export function createMockNoteTree(
  depositIndex: number,
  depositAmount: string | bigint,
): NoteTree {
  const depositNote = createMockDepositNote(depositIndex, depositAmount);
  return createNoteTree(depositNote);
}

/**
 * Create a NoteTree with a deposit → change structure (simulates one withdrawal)
 */
export function createMockTreeWithWithdrawal(
  depositIndex: number,
  depositAmount: string | bigint,
  withdrawnAmount: string | bigint,
): NoteTree {
  const remaining = BigInt(depositAmount) - BigInt(withdrawnAmount);
  const depositNote = createMockDepositNote(depositIndex, depositAmount, { status: 'spent' });
  const changeNote = createMockChangeNote(depositIndex, 1, remaining);

  const tree = createNoteTree(depositNote);
  addChild(tree.root, changeNote);

  return tree;
}

// ============================================================================
// Helpers
// ============================================================================

export function resetActivityCounter(): void {
  activityCounter = 0;
}

/**
 * Convert ETH amount to wei (handles decimals)
 * @param amount - ETH amount as number (e.g., 0.5 for 0.5 ETH)
 */
export function toEther(amount: number): bigint {
  // Convert to string to handle decimals properly
  const str = amount.toString();
  const [whole, decimal = ''] = str.split('.');
  const paddedDecimal = decimal.padEnd(18, '0').slice(0, 18);
  return BigInt(whole + paddedDecimal);
}
