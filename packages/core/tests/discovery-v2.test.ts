/**
 * Discovery v2 Tests
 *
 * Tests the note discovery logic including:
 * - Deposit scanning
 * - 1:1 withdrawal chain extension
 * - 2:1 Withdraw2 chain merging
 * - Primary/secondary chain determination (latest deposit continues)
 */

import { describe, it, expect } from 'vitest';
import type { Activity } from '@shinobi-cash/data';
import {
  buildActivityIndex,
  isDepositActivity,
  is1x1WithdrawalActivity,
  isWithdraw2Activity,
} from '../src/discovery-v2/activity-indexer.js';
import { scanForDeposits } from '../src/discovery-v2/deposit-scanner.js';
import { extendAllChains } from '../src/discovery-v2/chain-extender.js';
import { reconcileChains } from '../src/discovery-v2/reconciler.js';
import { deriveDepositPrecommitment, deriveAndHashNullifier } from '../src/discovery-v2/nullifier-utils.js';
import type { NoteChain, NullifierInfo } from '../src/discovery-v2/types.js';

// ============================================================================
// Test Fixtures
// ============================================================================

const TEST_POOL_ADDRESS = '0x1234567890123456789012345678901234567890';
const TEST_ACCOUNT_KEY = 12345678901234567890n;

function createMockDepositActivity(
  depositIndex: number,
  amount: string,
  overrides: Partial<Activity> = {},
): Activity {
  const precommitmentHash = deriveDepositPrecommitment(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, depositIndex);

  return {
    id: `deposit-${depositIndex}`,
    type: 'DEPOSIT',
    poolId: TEST_POOL_ADDRESS,
    user: '0xuser',
    amount: BigInt(amount),
    originalAmount: BigInt(amount),
    blockNumber: BigInt(1000 + depositIndex),
    timestamp: BigInt(Date.now()),
    originTransactionHash: `0xtx-deposit-${depositIndex}`,
    originChainId: BigInt(421614),
    aspStatus: 'approved',
    precommitmentHash,
    label: `Label-${depositIndex}`,
    ...overrides,
  } as Activity;
}

function createMock1x1WithdrawalActivity(
  depositIndex: number,
  changeIndex: number,
  withdrawnAmount: string,
  newCommitment: string,
  overrides: Partial<Activity> = {},
): Activity {
  const spentNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, depositIndex, changeIndex);

  return {
    id: `withdrawal-${depositIndex}-${changeIndex}`,
    type: 'WITHDRAWAL',
    poolId: TEST_POOL_ADDRESS,
    user: '0xuser',
    recipient: '0xrecipient',
    amount: BigInt(withdrawnAmount),
    blockNumber: BigInt(2000 + depositIndex * 10 + changeIndex),
    timestamp: BigInt(Date.now()),
    originTransactionHash: `0xtx-withdrawal-${depositIndex}-${changeIndex}`,
    originChainId: BigInt(421614),
    aspStatus: 'approved',
    spentNullifier,
    newCommitment,
    ...overrides,
  } as Activity;
}

function createMockWithdraw2Activity(
  depositIndex0: number,
  changeIndex0: number,
  depositIndex1: number,
  changeIndex1: number,
  withdrawnAmount: string,
  newCommitment: string,
  overrides: Partial<Activity> = {},
): Activity {
  const spentNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, depositIndex0, changeIndex0);
  const spentNullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, depositIndex1, changeIndex1);

  return {
    id: `withdraw2-${depositIndex0}-${depositIndex1}`,
    type: 'WITHDRAW2',
    poolId: TEST_POOL_ADDRESS,
    user: '0xuser',
    recipient: '0xrecipient',
    amount: BigInt(withdrawnAmount),
    blockNumber: BigInt(3000),
    timestamp: BigInt(Date.now()),
    originTransactionHash: `0xtx-withdraw2-${depositIndex0}-${depositIndex1}`,
    originChainId: BigInt(421614),
    aspStatus: 'approved',
    spentNullifier,
    spentNullifier1,
    newCommitment,
    ...overrides,
  } as Activity;
}

// ============================================================================
// Activity Indexer Tests
// ============================================================================

describe('Activity Indexer', () => {
  it('should identify deposit activities', () => {
    expect(isDepositActivity({ type: 'DEPOSIT' } as Activity)).toBe(true);
    expect(isDepositActivity({ type: 'CROSSCHAIN_DEPOSIT' } as Activity)).toBe(true);
    expect(isDepositActivity({ type: 'CROSSCHAIN_DEPOSIT_PENDING' } as Activity)).toBe(true);
    expect(isDepositActivity({ type: 'WITHDRAWAL' } as Activity)).toBe(false);
  });

  it('should identify 1:1 withdrawal activities', () => {
    expect(is1x1WithdrawalActivity({ type: 'WITHDRAWAL' } as Activity)).toBe(true);
    expect(is1x1WithdrawalActivity({ type: 'CROSSCHAIN_WITHDRAWAL' } as Activity)).toBe(true);
    expect(is1x1WithdrawalActivity({ type: 'WITHDRAW2' } as Activity)).toBe(false);
  });

  it('should identify Withdraw2 activities', () => {
    expect(isWithdraw2Activity({ type: 'WITHDRAW2' } as Activity)).toBe(true);
    expect(isWithdraw2Activity({ type: 'CROSSCHAIN_WITHDRAW2' } as Activity)).toBe(true);
    expect(isWithdraw2Activity({ type: 'CROSSCHAIN_WITHDRAW2_PENDING' } as Activity)).toBe(true);
    expect(isWithdraw2Activity({ type: 'WITHDRAWAL' } as Activity)).toBe(false);
  });

  it('should build activity index with correct maps', () => {
    const deposit = createMockDepositActivity(0, '1000000000000000000');
    const withdrawal = createMock1x1WithdrawalActivity(0, 0, '500000000000000000', '0xcommit1');
    const withdraw2 = createMockWithdraw2Activity(1, 0, 2, 0, '800000000000000000', '0xcommit2');

    const index = buildActivityIndex([deposit, withdrawal, withdraw2]);

    // Deposit indexed by precommitment
    expect(index.depositsByPrecommitment.size).toBe(1);
    expect(index.depositsByPrecommitment.get(deposit.precommitmentHash!)).toBe(deposit);

    // 1:1 withdrawal indexed by nullifier
    expect(index.withdrawalsByNullifier.size).toBe(1);
    expect(index.withdrawalsByNullifier.get(withdrawal.spentNullifier!)).toBe(withdrawal);

    // Withdraw2 indexed by BOTH nullifiers
    expect(index.withdraw2ByNullifier.size).toBe(2);
    expect(index.withdraw2ByNullifier.get(withdraw2.spentNullifier!)).toBe(withdraw2);
    expect(index.withdraw2ByNullifier.get(withdraw2.spentNullifier1!)).toBe(withdraw2);
  });
});

// ============================================================================
// Deposit Scanner Tests
// ============================================================================

describe('Deposit Scanner', () => {
  it('should discover sequential deposits', () => {
    const deposit0 = createMockDepositActivity(0, '1000000000000000000');
    const deposit1 = createMockDepositActivity(1, '2000000000000000000');

    const index = buildActivityIndex([deposit0, deposit1]);
    const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

    expect(result.depositsFound).toBe(2);
    expect(result.newChains.length).toBe(2);
    expect(result.nextDepositIndex).toBe(2);

    // Verify chain structure
    expect(result.newChains[0]![0]!.depositIndex).toBe(0);
    expect(result.newChains[0]![0]!.amount).toBe('1000000000000000000');
    expect(result.newChains[1]![0]!.depositIndex).toBe(1);
    expect(result.newChains[1]![0]!.amount).toBe('2000000000000000000');

    // Verify nullifier entries
    expect(result.newNullifierEntries.size).toBe(2);
  });

  it('should stop at first gap in deposit indices', () => {
    const deposit0 = createMockDepositActivity(0, '1000000000000000000');
    // Gap at index 1
    const deposit2 = createMockDepositActivity(2, '2000000000000000000');

    const index = buildActivityIndex([deposit0, deposit2]);
    const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

    // Should only find deposit 0 (stops at gap)
    expect(result.depositsFound).toBe(1);
    expect(result.nextDepositIndex).toBe(1);
  });

  it('should resume from correct index', () => {
    const deposit2 = createMockDepositActivity(2, '1000000000000000000');
    const deposit3 = createMockDepositActivity(3, '2000000000000000000');

    const index = buildActivityIndex([deposit2, deposit3]);
    const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 2, 10);

    expect(result.depositsFound).toBe(2);
    expect(result.nextDepositIndex).toBe(4);
  });
});

// ============================================================================
// Chain Extender Tests - 1:1 Withdrawals
// ============================================================================

describe('Chain Extender - 1:1 Withdrawals', () => {
  it('should extend chain with single withdrawal', () => {
    // Setup: deposit of 1 ETH, withdrawal of 0.3 ETH
    const deposit = createMockDepositActivity(0, '1000000000000000000');
    const withdrawal = createMock1x1WithdrawalActivity(0, 0, '300000000000000000', '0xcommit1');

    // Build initial state
    const depositIndex = buildActivityIndex([deposit]);
    const scanResult = scanForDeposits(depositIndex, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

    const chains = new Map<number, NoteChain>();
    const nullifierMap = new Map<string, NullifierInfo>();
    for (const chain of scanResult.newChains) {
      chains.set(chain[0]!.depositIndex, chain);
    }
    for (const [hash, info] of scanResult.newNullifierEntries) {
      nullifierMap.set(hash, info);
    }

    // Extend with withdrawal
    const withdrawalIndex = buildActivityIndex([withdrawal]);
    const result = extendAllChains(chains, nullifierMap, withdrawalIndex, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS);

    // Verify chain extended
    const chain = result.updatedChains.get(0)!;
    expect(chain.length).toBe(2);
    expect(chain[0]!.status).toBe('spent');
    expect(chain[1]!.noteType).toBe('change');
    expect(chain[1]!.changeIndex).toBe(1);
    expect(chain[1]!.amount).toBe('700000000000000000'); // 1 - 0.3 = 0.7 ETH
    expect(chain[1]!.status).toBe('unspent');
  });

  it('should extend chain with multiple sequential withdrawals', () => {
    const deposit = createMockDepositActivity(0, '1000000000000000000'); // 1 ETH
    const withdrawal1 = createMock1x1WithdrawalActivity(0, 0, '300000000000000000', '0xcommit1'); // -0.3
    const withdrawal2 = createMock1x1WithdrawalActivity(0, 1, '400000000000000000', '0xcommit2'); // -0.4

    // Build initial state
    const depositIndex = buildActivityIndex([deposit]);
    const scanResult = scanForDeposits(depositIndex, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

    const chains = new Map<number, NoteChain>();
    const nullifierMap = new Map<string, NullifierInfo>();
    for (const chain of scanResult.newChains) {
      chains.set(chain[0]!.depositIndex, chain);
    }
    for (const [hash, info] of scanResult.newNullifierEntries) {
      nullifierMap.set(hash, info);
    }

    // Extend with both withdrawals
    const withdrawalIndex = buildActivityIndex([withdrawal1, withdrawal2]);
    const result = extendAllChains(chains, nullifierMap, withdrawalIndex, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS);

    // Verify chain extended twice
    const chain = result.updatedChains.get(0)!;
    expect(chain.length).toBe(3);
    expect(chain[0]!.status).toBe('spent');
    expect(chain[1]!.status).toBe('spent');
    expect(chain[1]!.amount).toBe('700000000000000000'); // After first withdrawal
    expect(chain[2]!.status).toBe('unspent');
    expect(chain[2]!.amount).toBe('300000000000000000'); // 0.7 - 0.4 = 0.3 ETH
    expect(chain[2]!.changeIndex).toBe(2);
  });
});

// ============================================================================
// Chain Extender Tests - 2:1 Withdraw2
// ============================================================================

describe('Chain Extender - 2:1 Withdraw2', () => {
  it('should merge two chains with latest depositIndex continuing', () => {
    // Setup: Two deposits
    const deposit0 = createMockDepositActivity(0, '500000000000000000'); // 0.5 ETH
    const deposit1 = createMockDepositActivity(1, '700000000000000000'); // 0.7 ETH

    // Withdraw2: merge both, withdraw 0.8 ETH
    // Deposit 1 has larger index, so it wins
    const withdraw2 = createMockWithdraw2Activity(0, 0, 1, 0, '800000000000000000', '0xcommit');

    // Build initial state
    const depositIndex = buildActivityIndex([deposit0, deposit1]);
    const scanResult = scanForDeposits(depositIndex, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

    const chains = new Map<number, NoteChain>();
    const nullifierMap = new Map<string, NullifierInfo>();
    for (const chain of scanResult.newChains) {
      chains.set(chain[0]!.depositIndex, chain);
    }
    for (const [hash, info] of scanResult.newNullifierEntries) {
      nullifierMap.set(hash, info);
    }

    expect(chains.size).toBe(2);
    expect(nullifierMap.size).toBe(2);

    // Extend with Withdraw2
    const withdraw2Index = buildActivityIndex([withdraw2]);
    const result = extendAllChains(chains, nullifierMap, withdraw2Index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS);

    // Chain 0 (secondary - older deposit) should be marked as merged
    const chain0 = result.updatedChains.get(0)!;
    expect(chain0.length).toBe(1);
    expect(chain0[0]!.status).toBe('merged');
    expect(chain0[0]!.mergedIntoDepositIndex).toBe(1);

    // Chain 1 (primary - latest deposit) should have change note
    const chain1 = result.updatedChains.get(1)!;
    expect(chain1.length).toBe(2);
    expect(chain1[0]!.status).toBe('spent');
    expect(chain1[1]!.noteType).toBe('change');
    expect(chain1[1]!.amount).toBe('400000000000000000'); // 0.5 + 0.7 - 0.8 = 0.4 ETH
    expect(chain1[1]!.status).toBe('unspent');
    expect(chain1[1]!.mergedFromDepositIndex).toBe(0);

    // Nullifier map should have only the new change note's nullifier
    expect(result.updatedNullifierMap.size).toBe(1);
    const entry = Array.from(result.updatedNullifierMap.values())[0]!;
    expect(entry.depositIndex).toBe(1);
    expect(entry.changeIndex).toBe(1);
  });

  it('should handle Withdraw2 after 1:1 withdrawals', () => {
    // Setup: Two deposits, one has a prior withdrawal
    const deposit0 = createMockDepositActivity(0, '1000000000000000000'); // 1 ETH
    const deposit1 = createMockDepositActivity(1, '500000000000000000'); // 0.5 ETH
    const withdrawal0 = createMock1x1WithdrawalActivity(0, 0, '300000000000000000', '0xcommit1'); // -0.3 ETH from chain 0

    // After withdrawal0: chain0 has 0.7 ETH at changeIndex=1
    // Withdraw2: merge chain0@changeIndex1 with chain1@changeIndex0
    const withdraw2 = createMockWithdraw2Activity(0, 1, 1, 0, '600000000000000000', '0xcommit2');

    // Phase 1: Discover deposits
    const depositIndex = buildActivityIndex([deposit0, deposit1]);
    const scanResult = scanForDeposits(depositIndex, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

    const chains = new Map<number, NoteChain>();
    const nullifierMap = new Map<string, NullifierInfo>();
    for (const chain of scanResult.newChains) {
      chains.set(chain[0]!.depositIndex, chain);
    }
    for (const [hash, info] of scanResult.newNullifierEntries) {
      nullifierMap.set(hash, info);
    }

    // Phase 2a: Extend with 1:1 withdrawal
    const withdrawal1Index = buildActivityIndex([withdrawal0]);
    const result1 = extendAllChains(chains, nullifierMap, withdrawal1Index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS);

    // Verify chain 0 extended
    expect(result1.updatedChains.get(0)!.length).toBe(2);
    expect(result1.updatedChains.get(0)![1]!.amount).toBe('700000000000000000');

    // Phase 2b: Extend with Withdraw2
    const withdraw2Index = buildActivityIndex([withdraw2]);
    const result2 = extendAllChains(
      result1.updatedChains,
      result1.updatedNullifierMap,
      withdraw2Index,
      TEST_ACCOUNT_KEY,
      TEST_POOL_ADDRESS,
    );

    // Chain 0 (secondary - older deposit)
    const chain0 = result2.updatedChains.get(0)!;
    expect(chain0.length).toBe(2);
    expect(chain0[1]!.status).toBe('merged');
    expect(chain0[1]!.mergedIntoDepositIndex).toBe(1);

    // Chain 1 (primary - latest deposit)
    const chain1 = result2.updatedChains.get(1)!;
    expect(chain1.length).toBe(2);
    expect(chain1[0]!.status).toBe('spent');
    expect(chain1[1]!.amount).toBe('600000000000000000'); // 0.7 + 0.5 - 0.6 = 0.6 ETH
    expect(chain1[1]!.changeIndex).toBe(1);
  });

  it('should handle chained Withdraw2 operations', () => {
    // Setup: Three deposits
    const deposit0 = createMockDepositActivity(0, '300000000000000000'); // 0.3 ETH
    const deposit1 = createMockDepositActivity(1, '400000000000000000'); // 0.4 ETH
    const deposit2 = createMockDepositActivity(2, '500000000000000000'); // 0.5 ETH

    // First Withdraw2: merge 0 and 1, withdraw 0.2 ETH
    // Winner: deposit 1 (larger), resulting in 0.5 ETH at chain1@changeIndex1
    const withdraw2_1 = createMockWithdraw2Activity(0, 0, 1, 0, '200000000000000000', '0xcommit1');

    // Second Withdraw2: merge (chain1@changeIndex1) and (chain2@changeIndex0)
    // Winner: deposit 2 (larger), resulting in combined - withdrawn
    const withdraw2_2 = createMockWithdraw2Activity(1, 1, 2, 0, '400000000000000000', '0xcommit2');

    // Phase 1: Discover deposits
    const depositIndex = buildActivityIndex([deposit0, deposit1, deposit2]);
    const scanResult = scanForDeposits(depositIndex, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

    const chains = new Map<number, NoteChain>();
    const nullifierMap = new Map<string, NullifierInfo>();
    for (const chain of scanResult.newChains) {
      chains.set(chain[0]!.depositIndex, chain);
    }
    for (const [hash, info] of scanResult.newNullifierEntries) {
      nullifierMap.set(hash, info);
    }

    // Phase 2: Extend with both Withdraw2s
    const allWithdraw2Index = buildActivityIndex([withdraw2_1, withdraw2_2]);
    const result = extendAllChains(chains, nullifierMap, allWithdraw2Index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS);

    // Chain 0: merged into chain 1
    const chain0 = result.updatedChains.get(0)!;
    expect(chain0[0]!.status).toBe('merged');
    expect(chain0[0]!.mergedIntoDepositIndex).toBe(1);

    // Chain 1: first won against 0, then merged into 2
    const chain1 = result.updatedChains.get(1)!;
    expect(chain1.length).toBe(2);
    expect(chain1[0]!.status).toBe('spent');
    expect(chain1[1]!.status).toBe('merged');
    expect(chain1[1]!.mergedIntoDepositIndex).toBe(2);
    expect(chain1[1]!.amount).toBe('500000000000000000'); // 0.3 + 0.4 - 0.2 = 0.5 ETH

    // Chain 2: final primary chain with all combined value
    const chain2 = result.updatedChains.get(2)!;
    expect(chain2.length).toBe(2);
    expect(chain2[0]!.status).toBe('spent');
    expect(chain2[1]!.status).toBe('unspent');
    // Final: 0.5 (from chain1) + 0.5 (chain2) - 0.4 = 0.6 ETH
    expect(chain2[1]!.amount).toBe('600000000000000000');
  });
});

// ============================================================================
// Reconciler Tests
// ============================================================================

describe('Reconciler', () => {
  it('should update ASP status on all notes in chain', () => {
    const deposit = createMockDepositActivity(0, '1000000000000000000', { aspStatus: 'pending' });

    // Build chain
    const depositIndex = buildActivityIndex([deposit]);
    const scanResult = scanForDeposits(depositIndex, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

    const chains = new Map<number, NoteChain>();
    for (const chain of scanResult.newChains) {
      chains.set(chain[0]!.depositIndex, chain);
    }

    // Initial status is pending
    expect(chains.get(0)![0]!.aspStatus).toBe('pending');

    // Reconcile with updated activity
    const updatedDeposit = { ...deposit, aspStatus: 'approved' as const };
    reconcileChains(chains, [updatedDeposit]);

    // Status should be updated
    expect(chains.get(0)![0]!.aspStatus).toBe('approved');
  });

  it('should update label when assigned', () => {
    const deposit = createMockDepositActivity(0, '1000000000000000000', { label: undefined });

    const depositIndex = buildActivityIndex([deposit]);
    const scanResult = scanForDeposits(depositIndex, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

    const chains = new Map<number, NoteChain>();
    for (const chain of scanResult.newChains) {
      chains.set(chain[0]!.depositIndex, chain);
    }

    // Reconcile with label assigned
    const updatedDeposit = { ...deposit, label: '123456789' };
    reconcileChains(chains, [updatedDeposit]);

    expect(chains.get(0)![0]!.label).toBe('123456789');
  });
});

// ============================================================================
// Multi-Page Flow Tests (simulating processPage behavior)
// ============================================================================

describe('Multi-Page Flow', () => {
  /**
   * Simulates the processPage function from NoteDiscovery
   * This ensures we test the exact same 3-phase order used in production
   */
  function processPage(
    state: {
      chains: Map<number, NoteChain>;
      nullifierMap: Map<string, NullifierInfo>;
      nextDepositIndex: number;
    },
    activities: Activity[],
  ) {
    const activityIndex = buildActivityIndex(activities);

    // PHASE 1: Discover deposits (MUST happen first)
    const scanResult = scanForDeposits(activityIndex, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, state.nextDepositIndex, 100);

    // Merge new chains into state
    for (const chain of scanResult.newChains) {
      state.chains.set(chain[0]!.depositIndex, chain);
    }
    for (const [hash, info] of scanResult.newNullifierEntries) {
      state.nullifierMap.set(hash, info);
    }
    state.nextDepositIndex = scanResult.nextDepositIndex;

    // PHASE 2: Extend all chains
    const extensionResult = extendAllChains(
      state.chains,
      state.nullifierMap,
      activityIndex,
      TEST_ACCOUNT_KEY,
      TEST_POOL_ADDRESS,
    );
    state.chains = extensionResult.updatedChains;
    state.nullifierMap = extensionResult.updatedNullifierMap;

    // PHASE 3: Reconcile
    reconcileChains(state.chains, activities);

    return state;
  }

  it('should handle deposits on page 1 and withdrawals on page 2', () => {
    // Page 1: Deposits only
    const deposit0 = createMockDepositActivity(0, '1000000000000000000');
    const deposit1 = createMockDepositActivity(1, '500000000000000000');

    // Page 2: Withdrawals only
    const withdrawal = createMock1x1WithdrawalActivity(0, 0, '300000000000000000', '0xc1');
    const withdraw2 = createMockWithdraw2Activity(0, 1, 1, 0, '400000000000000000', '0xc2');

    // Initialize state
    let state = {
      chains: new Map<number, NoteChain>(),
      nullifierMap: new Map<string, NullifierInfo>(),
      nextDepositIndex: 0,
    };

    // Process page 1
    state = processPage(state, [deposit0, deposit1]);

    expect(state.chains.size).toBe(2);
    expect(state.nullifierMap.size).toBe(2);
    expect(state.nextDepositIndex).toBe(2);

    // Process page 2
    state = processPage(state, [withdrawal, withdraw2]);

    // Chain 0: deposit -> change (0.7 ETH) -> merged into chain 1
    const chain0 = state.chains.get(0)!;
    expect(chain0.length).toBe(2);
    expect(chain0[0]!.status).toBe('spent');
    expect(chain0[1]!.status).toBe('merged');
    expect(chain0[1]!.amount).toBe('700000000000000000');
    expect(chain0[1]!.mergedIntoDepositIndex).toBe(1);

    // Chain 1: deposit -> change (combined from merge)
    const chain1 = state.chains.get(1)!;
    expect(chain1.length).toBe(2);
    expect(chain1[0]!.status).toBe('spent');
    expect(chain1[1]!.status).toBe('unspent');
    // 0.7 (from chain0) + 0.5 (chain1) - 0.4 = 0.8 ETH
    expect(chain1[1]!.amount).toBe('800000000000000000');
  });

  it('should handle Withdraw2 spanning across pages', () => {
    // Page 1: First deposit
    const deposit0 = createMockDepositActivity(0, '600000000000000000');

    // Page 2: Second deposit + Withdraw2 that merges both
    const deposit1 = createMockDepositActivity(1, '400000000000000000');
    const withdraw2 = createMockWithdraw2Activity(0, 0, 1, 0, '300000000000000000', '0xc1');

    let state = {
      chains: new Map<number, NoteChain>(),
      nullifierMap: new Map<string, NullifierInfo>(),
      nextDepositIndex: 0,
    };

    // Process page 1 - only deposit 0
    state = processPage(state, [deposit0]);
    expect(state.chains.size).toBe(1);

    // Process page 2 - deposit 1 discovered, then Withdraw2 processes both
    state = processPage(state, [deposit1, withdraw2]);

    // Both deposits should be found
    expect(state.chains.size).toBe(2);

    // Chain 0 (secondary): merged into chain 1
    const chain0 = state.chains.get(0)!;
    expect(chain0[0]!.status).toBe('merged');

    // Chain 1 (primary): has combined change note
    const chain1 = state.chains.get(1)!;
    expect(chain1.length).toBe(2);
    expect(chain1[1]!.amount).toBe('700000000000000000'); // 0.6 + 0.4 - 0.3
    expect(chain1[1]!.mergedFromDepositIndex).toBe(0);
  });

  it('should handle withdrawal before deposit is discovered (deferred)', () => {
    // This tests the case where withdrawal activity appears but deposit hasn't been found yet
    // The extension phase should not find any match (nullifier not in map)

    // Page 1: Only withdrawal (deposit not yet discovered)
    const withdrawal = createMock1x1WithdrawalActivity(0, 0, '300000000000000000', '0xc1');

    let state = {
      chains: new Map<number, NoteChain>(),
      nullifierMap: new Map<string, NullifierInfo>(),
      nextDepositIndex: 0,
    };

    // Process page 1 - no deposits, withdrawal can't be applied
    state = processPage(state, [withdrawal]);
    expect(state.chains.size).toBe(0);
    expect(state.nullifierMap.size).toBe(0);

    // Page 2: Deposit appears
    const deposit = createMockDepositActivity(0, '1000000000000000000');
    state = processPage(state, [deposit]);

    // Deposit found, but withdrawal was on previous page
    expect(state.chains.size).toBe(1);
    expect(state.chains.get(0)!.length).toBe(1); // Only deposit, no change note
    expect(state.chains.get(0)![0]!.status).toBe('unspent');

    // Page 3: Same withdrawal reappears (re-fetched or paginated differently)
    state = processPage(state, [withdrawal]);

    // Now the chain should be extended
    expect(state.chains.get(0)!.length).toBe(2);
    expect(state.chains.get(0)![1]!.amount).toBe('700000000000000000');
  });

  it('should correctly order phases: discover ALL deposits before extending', () => {
    // Critical test: If we have deposit0, deposit1, and withdraw2(0,1) in same page,
    // both deposits MUST be discovered before withdraw2 is processed

    const deposit0 = createMockDepositActivity(0, '500000000000000000');
    const deposit1 = createMockDepositActivity(1, '500000000000000000');
    const withdraw2 = createMockWithdraw2Activity(0, 0, 1, 0, '200000000000000000', '0xc1');

    let state = {
      chains: new Map<number, NoteChain>(),
      nullifierMap: new Map<string, NullifierInfo>(),
      nextDepositIndex: 0,
    };

    // Process single page with all activities
    state = processPage(state, [deposit0, deposit1, withdraw2]);

    // Both deposits should be discovered
    expect(state.chains.size).toBe(2);

    // Withdraw2 should have processed correctly (both nullifiers were in map)
    const chain0 = state.chains.get(0)!;
    expect(chain0[0]!.status).toBe('merged');

    const chain1 = state.chains.get(1)!;
    expect(chain1.length).toBe(2);
    expect(chain1[1]!.amount).toBe('800000000000000000'); // 0.5 + 0.5 - 0.2
  });

  it('should handle state persistence and resume', () => {
    // Simulate resuming from saved state
    const deposit0 = createMockDepositActivity(0, '1000000000000000000');

    let state = {
      chains: new Map<number, NoteChain>(),
      nullifierMap: new Map<string, NullifierInfo>(),
      nextDepositIndex: 0,
    };

    // Process first page
    state = processPage(state, [deposit0]);
    expect(state.nextDepositIndex).toBe(1);

    // Simulate serialization/deserialization (resume)
    const serializedChains = Array.from(state.chains.entries());
    const serializedNullifiers = Array.from(state.nullifierMap.entries());

    // Create "resumed" state
    let resumedState = {
      chains: new Map(serializedChains),
      nullifierMap: new Map(serializedNullifiers),
      nextDepositIndex: state.nextDepositIndex,
    };

    // Process next page with new deposit and withdrawal
    const deposit1 = createMockDepositActivity(1, '500000000000000000');
    const withdrawal = createMock1x1WithdrawalActivity(0, 0, '400000000000000000', '0xc1');

    resumedState = processPage(resumedState, [deposit1, withdrawal]);

    // Should have both chains
    expect(resumedState.chains.size).toBe(2);

    // Chain 0 should be extended
    expect(resumedState.chains.get(0)!.length).toBe(2);
    expect(resumedState.chains.get(0)![1]!.amount).toBe('600000000000000000');
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration - Full Discovery Flow', () => {
  it('should handle complete discovery scenario', () => {
    // Scenario:
    // 1. User makes 3 deposits
    // 2. User makes 1:1 withdrawal from deposit 0
    // 3. User makes Withdraw2 merging deposits 1 and 2
    // 4. Final state: chain0 with change, chains 1&2 merged into chain2

    const deposit0 = createMockDepositActivity(0, '1000000000000000000'); // 1 ETH
    const deposit1 = createMockDepositActivity(1, '500000000000000000'); // 0.5 ETH
    const deposit2 = createMockDepositActivity(2, '800000000000000000'); // 0.8 ETH

    const withdrawal0 = createMock1x1WithdrawalActivity(0, 0, '400000000000000000', '0xc1'); // -0.4 ETH
    const withdraw2 = createMockWithdraw2Activity(1, 0, 2, 0, '500000000000000000', '0xc2'); // -0.5 ETH

    // === Page 1: All deposits ===
    const page1Activities = [deposit0, deposit1, deposit2];
    const page1Index = buildActivityIndex(page1Activities);

    // Discover deposits
    const scanResult = scanForDeposits(page1Index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

    const chains = new Map<number, NoteChain>();
    const nullifierMap = new Map<string, NullifierInfo>();
    for (const chain of scanResult.newChains) {
      chains.set(chain[0]!.depositIndex, chain);
    }
    for (const [hash, info] of scanResult.newNullifierEntries) {
      nullifierMap.set(hash, info);
    }

    expect(scanResult.depositsFound).toBe(3);

    // === Page 2: Withdrawals ===
    const page2Activities = [withdrawal0, withdraw2];
    const page2Index = buildActivityIndex(page2Activities);

    // Extend chains
    const extensionResult = extendAllChains(chains, nullifierMap, page2Index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS);

    // Verify final state
    const finalChains = extensionResult.updatedChains;

    // Chain 0: deposit -> change (after 1:1 withdrawal)
    const chain0 = finalChains.get(0)!;
    expect(chain0.length).toBe(2);
    expect(chain0[1]!.amount).toBe('600000000000000000'); // 1 - 0.4 = 0.6 ETH
    expect(chain0[1]!.status).toBe('unspent');

    // Chain 1: merged into chain 2
    const chain1 = finalChains.get(1)!;
    expect(chain1[0]!.status).toBe('merged');
    expect(chain1[0]!.mergedIntoDepositIndex).toBe(2);

    // Chain 2: deposit -> change (primary chain of Withdraw2)
    const chain2 = finalChains.get(2)!;
    expect(chain2.length).toBe(2);
    expect(chain2[1]!.amount).toBe('800000000000000000'); // 0.5 + 0.8 - 0.5 = 0.8 ETH
    expect(chain2[1]!.status).toBe('unspent');
    expect(chain2[1]!.mergedFromDepositIndex).toBe(1);

    // Nullifier map should have 2 entries (chain0@change1, chain2@change1)
    expect(extensionResult.updatedNullifierMap.size).toBe(2);
  });
});
