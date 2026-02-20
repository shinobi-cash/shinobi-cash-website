/**
 * Shared test fixtures for discovery tests
 */

import type {
  ActivityItem,
  DepositActivity,
  CrosschainDepositFillActivity,
  CrosschainDepositIntentActivity,
  CrosschainDepositRefundActivity,
  WithdrawActivity,
  Withdraw2Activity,
  CrosschainWithdrawIntentActivity,
  CrosschainWithdraw2IntentActivity,
  CrosschainWithdrawalFillActivity,
  CrosschainWithdrawalRefundActivity,
  RagequitActivity,
} from '@shinobi-cash/data';
import type { Note, DepositNote, ChangeNote, DepositIntent, WithdrawalIntent, WithdrawalRefundedNote, RagequitNote, MergedNote, NoteTree } from '../../src/discovery/types.js';
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

/**
 * Create a mock same-chain deposit activity (DEPOSIT)
 */
export function createMockDepositActivity(
  depositIndex: number,
  amount: string | bigint,
  overrides: Partial<DepositActivity> = {},
): DepositActivity {
  const precommitment = deriveDepositPrecommitment(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, depositIndex);

  return {
    type: 'DEPOSIT',
    txHash: `0xtx-deposit-${depositIndex}-${++activityCounter}`,
    chainId: TEST_CHAIN_ID,
    timestamp: Date.now().toString(),
    user: TEST_USER_ADDRESS,
    pool: TEST_POOL_ADDRESS,
    amount: amount.toString(),
    aspStatus: 'approved',
    commitment: `0xcommitment-${depositIndex}`,
    label: (depositIndex + 1000).toString(),
    precommitment,
    originalAmount: amount.toString(),
    vettingFeeAmount: '0',
    vettingFeeRecipient: TEST_USER_ADDRESS,
    ...overrides,
  };
}

/**
 * Create a mock cross-chain deposit fill activity (CROSSCHAIN_DEPOSIT_FILL)
 */
export function createMockCrossChainDepositActivity(
  depositIndex: number,
  amount: string | bigint,
  overrides: Partial<CrosschainDepositFillActivity> = {},
): CrosschainDepositFillActivity {
  const precommitment = deriveDepositPrecommitment(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, depositIndex);

  return {
    type: 'CROSSCHAIN_DEPOSIT_FILL',
    txHash: `0xtx-fill-${depositIndex}-${++activityCounter}`,
    chainId: '421614', // Pool chain (destination)
    timestamp: Date.now().toString(),
    user: TEST_USER_ADDRESS,
    pool: TEST_POOL_ADDRESS,
    amount: amount.toString(),
    orderId: `order-${depositIndex}`,
    aspStatus: 'approved',
    commitment: `0xcommitment-${depositIndex}`,
    label: (depositIndex + 1000).toString(),
    precommitment,
    originalAmount: amount.toString(),
    vettingFeeAmount: '0',
    vettingFeeRecipient: TEST_USER_ADDRESS,
    solver: '0xsolver',
    ...overrides,
  };
}

/**
 * Create a mock cross-chain deposit intent activity (CROSSCHAIN_DEPOSIT_INTENT)
 */
export function createMockPendingCrossChainDepositActivity(
  depositIndex: number,
  amount: string | bigint,
  overrides: Partial<CrosschainDepositIntentActivity> = {},
): CrosschainDepositIntentActivity {
  const precommitment = deriveDepositPrecommitment(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, depositIndex);

  return {
    type: 'CROSSCHAIN_DEPOSIT_INTENT',
    txHash: `0xtx-deposit-intent-${depositIndex}-${++activityCounter}`,
    chainId: '84532', // Origin chain
    timestamp: Date.now().toString(),
    user: TEST_USER_ADDRESS,
    pool: TEST_POOL_ADDRESS,
    amount: amount.toString(),
    orderId: `order-pending-${depositIndex}`,
    precommitment,
    destinationChainId: '421614', // Pool chain
    destinationPool: TEST_POOL_ADDRESS,
    totalPaid: amount.toString(),
    netDepositAmount: amount.toString(),
    asset: '0x0000000000000000000000000000000000000000',
    solverFee: '0',
    ...overrides,
  };
}

/**
 * Create a mock same-chain 1:1 withdrawal activity (WITHDRAW)
 */
export function createMock1x1WithdrawalActivity(
  depositIndex: number,
  changeIndex: number,
  withdrawnAmount: string | bigint,
  overrides: Partial<WithdrawActivity> = {},
): WithdrawActivity {
  const spentNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, depositIndex, changeIndex);

  return {
    type: 'WITHDRAW',
    txHash: `0xtx-withdrawal-${depositIndex}-${changeIndex}-${++activityCounter}`,
    chainId: TEST_CHAIN_ID,
    timestamp: Date.now().toString(),
    user: TEST_USER_ADDRESS,
    pool: TEST_POOL_ADDRESS,
    amount: withdrawnAmount.toString(),
    asset: '0x0000000000000000000000000000000000000000',
    nullifierCount: 1,
    newCommitment: `0xcommitment-${depositIndex}-${changeIndex + 1}`,
    withdrawnValue: withdrawnAmount.toString(),
    relayer: TEST_USER_ADDRESS,
    recipient: TEST_RECIPIENT_ADDRESS,
    relayFee: '0',
    spentNullifiers: [spentNullifier],
    ...overrides,
  };
}

/**
 * Create a mock cross-chain 1:1 withdrawal intent activity (CROSSCHAIN_WITHDRAW_INTENT)
 */
export function createMockCrossChainWithdrawalActivity(
  depositIndex: number,
  changeIndex: number,
  withdrawnAmount: string | bigint,
  overrides: Partial<CrosschainWithdrawIntentActivity> = {},
): CrosschainWithdrawIntentActivity {
  const spentNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, depositIndex, changeIndex);

  return {
    type: 'CROSSCHAIN_WITHDRAW_INTENT',
    txHash: `0xtx-crosschain-${depositIndex}-${changeIndex}-${++activityCounter}`,
    chainId: TEST_CHAIN_ID,
    timestamp: Date.now().toString(),
    user: TEST_USER_ADDRESS,
    pool: TEST_POOL_ADDRESS,
    amount: withdrawnAmount.toString(),
    orderId: `order-withdraw-${depositIndex}-${changeIndex}`,
    asset: '0x0000000000000000000000000000000000000000',
    nullifierCount: 1,
    newCommitment: `0xcommitment-${depositIndex}-${changeIndex + 1}`,
    withdrawnValue: withdrawnAmount.toString(),
    relayer: TEST_USER_ADDRESS,
    recipient: TEST_RECIPIENT_ADDRESS,
    relayFee: '0',
    refundCommitment: `0xrefund-${depositIndex}-${changeIndex}`,
    solverFee: '0',
    spentNullifiers: [spentNullifier],
    ...overrides,
  };
}

/**
 * Create a mock same-chain 2:1 withdrawal activity (WITHDRAW_2)
 */
export function createMockWithdraw2Activity(
  depositIndex0: number,
  changeIndex0: number,
  depositIndex1: number,
  changeIndex1: number,
  withdrawnAmount: string | bigint,
  overrides: Partial<Withdraw2Activity> = {},
): Withdraw2Activity {
  const spentNullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, depositIndex0, changeIndex0);
  const spentNullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, depositIndex1, changeIndex1);

  return {
    type: 'WITHDRAW_2',
    txHash: `0xtx-withdraw2-${depositIndex0}-${depositIndex1}-${++activityCounter}`,
    chainId: TEST_CHAIN_ID,
    timestamp: Date.now().toString(),
    user: TEST_USER_ADDRESS,
    pool: TEST_POOL_ADDRESS,
    amount: withdrawnAmount.toString(),
    asset: '0x0000000000000000000000000000000000000000',
    nullifierCount: 2,
    newCommitment: `0xcommitment-${depositIndex0}-merged`,
    withdrawnValue: withdrawnAmount.toString(),
    relayer: TEST_USER_ADDRESS,
    recipient: TEST_RECIPIENT_ADDRESS,
    relayFee: '0',
    spentNullifiers: [spentNullifier0, spentNullifier1],
    ...overrides,
  };
}

/**
 * Create a mock cross-chain 2:1 withdrawal intent activity (CROSSCHAIN_WITHDRAW_2_INTENT)
 */
export function createMockCrossChainWithdraw2Activity(
  depositIndex0: number,
  changeIndex0: number,
  depositIndex1: number,
  changeIndex1: number,
  withdrawnAmount: string | bigint,
  overrides: Partial<CrosschainWithdraw2IntentActivity> = {},
): CrosschainWithdraw2IntentActivity {
  const spentNullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, depositIndex0, changeIndex0);
  const spentNullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, depositIndex1, changeIndex1);

  return {
    type: 'CROSSCHAIN_WITHDRAW_2_INTENT',
    txHash: `0xtx-crosschain-withdraw2-${depositIndex0}-${depositIndex1}-${++activityCounter}`,
    chainId: TEST_CHAIN_ID,
    timestamp: Date.now().toString(),
    user: TEST_USER_ADDRESS,
    pool: TEST_POOL_ADDRESS,
    amount: withdrawnAmount.toString(),
    orderId: `order-withdraw2-${depositIndex0}-${depositIndex1}`,
    asset: '0x0000000000000000000000000000000000000000',
    nullifierCount: 2,
    newCommitment: `0xcommitment-${depositIndex0}-merged`,
    withdrawnValue: withdrawnAmount.toString(),
    relayer: TEST_USER_ADDRESS,
    recipient: TEST_RECIPIENT_ADDRESS,
    relayFee: '0',
    refundCommitment: `0xrefund-${depositIndex0}-${depositIndex1}`,
    solverFee: '0',
    spentNullifiers: [spentNullifier0, spentNullifier1],
    ...overrides,
  };
}

/**
 * Create a mock cross-chain withdrawal fill activity (CROSSCHAIN_WITHDRAWAL_FILL)
 */
export function createMockCrossChainWithdrawalFillActivity(
  depositIndex: number,
  changeIndex: number,
  withdrawnAmount: string | bigint,
  overrides: Partial<CrosschainWithdrawalFillActivity> = {},
): CrosschainWithdrawalFillActivity {
  return {
    type: 'CROSSCHAIN_WITHDRAWAL_FILL',
    txHash: `0xtx-fill-${depositIndex}-${changeIndex}-${++activityCounter}`,
    chainId: '84532', // Destination chain
    timestamp: Date.now().toString(),
    user: TEST_USER_ADDRESS,
    pool: TEST_POOL_ADDRESS,
    amount: withdrawnAmount.toString(),
    orderId: `order-withdraw-${depositIndex}-${changeIndex}`,
    solver: '0xsolver',
    recipient: TEST_RECIPIENT_ADDRESS,
    ...overrides,
  };
}

/**
 * Create a mock cross-chain withdrawal refund activity (CROSSCHAIN_WITHDRAWAL_REFUND)
 */
export function createMockCrossChainWithdrawalRefundActivity(
  depositIndex: number,
  changeIndex: number,
  refundAmount: string | bigint,
  overrides: Partial<CrosschainWithdrawalRefundActivity> = {},
): CrosschainWithdrawalRefundActivity {
  return {
    type: 'CROSSCHAIN_WITHDRAWAL_REFUND',
    txHash: `0xtx-refund-${depositIndex}-${changeIndex}-${++activityCounter}`,
    chainId: TEST_CHAIN_ID, // Pool chain (origin of withdrawal)
    timestamp: Date.now().toString(),
    user: TEST_USER_ADDRESS,
    pool: TEST_POOL_ADDRESS,
    amount: refundAmount.toString(),
    orderId: `order-withdraw-${depositIndex}-${changeIndex}`,
    refundCommitment: `0xrefund-${depositIndex}-${changeIndex}`,
    netRefundAmount: refundAmount.toString(),
    refundFee: '0',
    refundFeeRecipient: TEST_USER_ADDRESS,
    ...overrides,
  };
}

/**
 * Create a mock cross-chain deposit refund activity (CROSSCHAIN_DEPOSIT_REFUND)
 */
export function createMockCrossChainDepositRefundActivity(
  depositIndex: number,
  overrides: Partial<CrosschainDepositRefundActivity> = {},
): CrosschainDepositRefundActivity {
  return {
    type: 'CROSSCHAIN_DEPOSIT_REFUND',
    txHash: `0xtx-deposit-refund-${depositIndex}-${++activityCounter}`,
    chainId: '84532', // Origin chain
    timestamp: Date.now().toString(),
    user: TEST_USER_ADDRESS,
    pool: TEST_POOL_ADDRESS,
    amount: '0',
    orderId: `order-pending-${depositIndex}`,
    ...overrides,
  };
}

/**
 * Create a mock ragequit activity (RAGEQUIT)
 */
export function createMockRagequitActivity(
  depositIndex: number,
  changeIndex: number,
  commitment: string,
  overrides: Partial<RagequitActivity> = {},
): RagequitActivity {
  return {
    type: 'RAGEQUIT',
    txHash: `0xtx-ragequit-${depositIndex}-${changeIndex}-${++activityCounter}`,
    chainId: TEST_CHAIN_ID,
    timestamp: Date.now().toString(),
    user: TEST_USER_ADDRESS,
    pool: TEST_POOL_ADDRESS,
    amount: '0',
    commitment,
    label: (depositIndex + 1000).toString(),
    ...overrides,
  };
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
    serialNumber: generateSerialNumber(TEST_CHAIN_ID, depositIndex, 0),
    poolAddress: TEST_POOL_ADDRESS,
    depositIndex,
    changeIndex: 0,
    amount: amount.toString(),
    label: (depositIndex + 1000).toString(),
    status: 'unspent',
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
    serialNumber: generateSerialNumber(TEST_CHAIN_ID, depositIndex, changeIndex),
    poolAddress: TEST_POOL_ADDRESS,
    depositIndex,
    changeIndex,
    amount: amount.toString(),
    label: (depositIndex + 1000).toString(),
    status: 'unspent',
    originTimestamp: Date.now().toString(),
    originChainId: TEST_CHAIN_ID,
    originTransactionHash: `0xtx-withdrawal-${depositIndex}-${changeIndex}`,
    aspStatus: 'approved',
    mergedFrom: {},
    activityData: {},
    ...overrides,
  };
}

export function createMockWithdrawalIntent(
  depositIndex: number,
  changeIndex: number,
  amount: string | bigint,
  overrides: Partial<WithdrawalIntent> = {},
): WithdrawalIntent {
  return {
    intentType: 'withdrawalIntent',
    poolAddress: TEST_POOL_ADDRESS,
    depositIndex,
    changeIndex,
    amount: amount.toString(),
    originTimestamp: Date.now().toString(),
    originChainId: TEST_CHAIN_ID,
    originTransactionHash: `0xtx-crosschain-${depositIndex}-${changeIndex}`,
    destinationChainId: '84532',
    orderId: `order-${depositIndex}-${changeIndex}`,
    fillDeadline: (Math.floor(Date.now() / 1000) + 3600).toString(),
    expires: (Math.floor(Date.now() / 1000) + 86400).toString(),
    refundCommitment: `0xrefund-${depositIndex}-${changeIndex}`,
    refundChangeIndex: changeIndex + 1, // Same level as sibling ChangeNote
    activityData: {},
    ...overrides,
  };
}

/** @deprecated Use createMockWithdrawalIntent instead */
export const createMockWithdrawalIntentNote = createMockWithdrawalIntent;

export function createMockDepositIntent(
  depositIndex: number,
  amount: string | bigint,
  overrides: Partial<DepositIntent> = {},
): DepositIntent {
  const chainId = '84532'; // Base Sepolia (origin)
  return {
    intentType: 'depositIntent',
    poolAddress: TEST_POOL_ADDRESS,
    depositIndex,
    changeIndex: 0,
    amount: amount.toString(),
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

/** @deprecated Use createMockDepositIntent instead */
export const createMockDepositIntentNote = createMockDepositIntent;

export function createMockWithdrawalRefundedNote(
  depositIndex: number,
  changeIndex: number,
  amount: string | bigint,
  overrides: Partial<WithdrawalRefundedNote> = {},
): WithdrawalRefundedNote {
  return {
    noteType: 'withdrawalRefunded',
    serialNumber: generateSerialNumber(TEST_CHAIN_ID, depositIndex, changeIndex, 0), // refundIndex=0
    poolAddress: TEST_POOL_ADDRESS,
    depositIndex,
    changeIndex,
    amount: amount.toString(),
    label: (depositIndex + 1000).toString(),
    status: 'unspent',
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
    amount: '0', // Terminal note has no remaining balance
    ragequitAmount: amount.toString(),
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
    amount: '0', // Terminal note has no remaining balance
    contributedAmount: amount.toString(),
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
