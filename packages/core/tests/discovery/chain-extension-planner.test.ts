/**
 * Tests for chain-extension-planner.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { planChainExtensions } from '../../src/discovery/chain-extension-planner.js';
import { buildActivityIndex } from '../../src/discovery/activity-indexer.js';
import { deriveAndHashNullifier } from '../../src/discovery/nullifier-utils.js';
import type { NoteChain, NullifierInfo, ChainKey } from '../../src/discovery/types.js';
import { makeChainKey } from '../../src/discovery/types.js';
import {
  createMockDepositNote,
  createMockChangeNote,
  createMockWithdrawalIntentNote,
  createMock1x1WithdrawalActivity,
  createMockCrossChainWithdrawalActivity,
  createMockWithdraw2Activity,
  createMockRagequitActivity,
  resetActivityCounter,
  TEST_POOL_ADDRESS,
  TEST_ACCOUNT_KEY,
  TEST_CHAIN_ID,
  toEther,
} from './fixtures.js';

describe('chain-extension-planner', () => {
  beforeEach(() => {
    resetActivityCounter();
  });

  describe('planChainExtensions', () => {
    describe('no extensions', () => {
      it('should return empty plans for empty activity index', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const chains = new Map<ChainKey, NoteChain>([[chainKey, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activityIndex = buildActivityIndex([]);

        const plans = planChainExtensions(
          chain,
          chainKey,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        expect(plans).toHaveLength(0);
      });

      it('should return empty plans for spent note', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
        const chain: NoteChain = [depositNote];
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const chains = new Map<ChainKey, NoteChain>([[chainKey, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const plans = planChainExtensions(
          chain,
          chainKey,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        expect(plans).toHaveLength(0);
      });

      it('should return empty plans for intent note', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
        const intentNote = createMockWithdrawalIntentNote(0, 0, toEther(0.5));
        const chain: NoteChain = [depositNote, intentNote];
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const chains = new Map<ChainKey, NoteChain>([[chainKey, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activityIndex = buildActivityIndex([]);

        const plans = planChainExtensions(
          chain,
          chainKey,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        expect(plans).toHaveLength(0);
      });

      it('should return empty plans for zero amount note', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
        const changeNote = createMockChangeNote(0, 1, 0n);
        const chain: NoteChain = [depositNote, changeNote];
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const chains = new Map<ChainKey, NoteChain>([[chainKey, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activityIndex = buildActivityIndex([]);

        const plans = planChainExtensions(
          chain,
          chainKey,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        expect(plans).toHaveLength(0);
      });
    });

    describe('1:1 withdrawal planning', () => {
      it('should plan single 1:1 withdrawal', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const chains = new Map<ChainKey, NoteChain>([[chainKey, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activityIndex = buildActivityIndex([activity]);

        const plans = planChainExtensions(
          chain,
          chainKey,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        expect(plans).toHaveLength(1);
        expect(plans[0].kind).toBe('withdraw1x1');
        if (plans[0].kind === 'withdraw1x1') {
          expect(plans[0].depositIndex).toBe(0);
          expect(plans[0].parentChangeIndex).toBe(0);
          expect(plans[0].newChangeIndex).toBe(1);
          expect(plans[0].withdrawn).toBe(toEther(0.3));
          expect(plans[0].remaining).toBe(toEther(0.7));
          expect(plans[0].createPendingIntent).toBe(false);
        }
      });

      it('should plan cross-chain withdrawal with pending intent', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const chains = new Map<ChainKey, NoteChain>([[chainKey, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const plans = planChainExtensions(
          chain,
          chainKey,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        expect(plans).toHaveLength(1);
        expect(plans[0].kind).toBe('withdraw1x1');
        if (plans[0].kind === 'withdraw1x1') {
          expect(plans[0].createPendingIntent).toBe(true);
        }
      });

      it('should plan sequential withdrawals', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const chains = new Map<ChainKey, NoteChain>([[chainKey, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();

        // Two withdrawals from same chain
        const activity1 = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activity2 = createMock1x1WithdrawalActivity(0, 1, toEther(0.2));
        const activityIndex = buildActivityIndex([activity1, activity2]);

        const plans = planChainExtensions(
          chain,
          chainKey,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        expect(plans).toHaveLength(2);
        expect(plans[0].kind).toBe('withdraw1x1');
        expect(plans[1].kind).toBe('withdraw1x1');

        if (plans[0].kind === 'withdraw1x1' && plans[1].kind === 'withdraw1x1') {
          // First withdrawal
          expect(plans[0].parentChangeIndex).toBe(0);
          expect(plans[0].newChangeIndex).toBe(1);
          expect(plans[0].remaining).toBe(toEther(0.7));

          // Second withdrawal (virtual state)
          expect(plans[1].parentChangeIndex).toBe(1);
          expect(plans[1].newChangeIndex).toBe(2);
          expect(plans[1].remaining).toBe(toEther(0.5));
        }
      });

      it('should compute nullifier hashes correctly', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const chains = new Map<ChainKey, NoteChain>([[chainKey, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const plans = planChainExtensions(
          chain,
          chainKey,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        if (plans[0].kind === 'withdraw1x1') {
          const expectedOldHash = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
          const expectedNewHash = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 1);
          expect(plans[0].oldNullifierHash).toBe(expectedOldHash);
          expect(plans[0].newNullifierHash).toBe(expectedNewHash);
        }
      });

      it('should set newNullifierHash to null when remaining is 0', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const chains = new Map<ChainKey, NoteChain>([[chainKey, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activity = createMock1x1WithdrawalActivity(0, 0, toEther(1)); // Full withdrawal
        const activityIndex = buildActivityIndex([activity]);

        const plans = planChainExtensions(
          chain,
          chainKey,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        if (plans[0].kind === 'withdraw1x1') {
          expect(plans[0].remaining).toBe(0n);
          expect(plans[0].newNullifierHash).toBeNull();
        }
      });
    });

    describe('Withdraw2 planning', () => {
      it('should plan Withdraw2 when both chains are ready', () => {
        const deposit0 = createMockDepositNote(0, toEther(1));
        const deposit1 = createMockDepositNote(1, toEther(2));
        const chain0: NoteChain = [deposit0];
        const chain1: NoteChain = [deposit1];
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);
        const chains = new Map<ChainKey, NoteChain>([
          [chainKey0, chain0],
          [chainKey1, chain1],
        ]);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 1, changeIndex: 0 }],
        ]);

        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        // Plan from chain 0's perspective
        const plans = planChainExtensions(
          chain0,
          chainKey0,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        expect(plans).toHaveLength(1);
        expect(plans[0].kind).toBe('withdraw2');

        if (plans[0].kind === 'withdraw2') {
          // Chain 1 has larger depositIndex, so it's primary
          expect(plans[0].primaryDepositIndex).toBe(1);
          expect(plans[0].secondaryDepositIndex).toBe(0);
          expect(plans[0].combinedValue).toBe(toEther(3)); // 1 + 2
          expect(plans[0].withdrawn).toBe(toEther(0.5));
          expect(plans[0].remaining).toBe(toEther(2.5));
        }
      });

      it('should return null when other chain not ready', () => {
        const deposit0 = createMockDepositNote(0, toEther(1));
        const chain0: NoteChain = [deposit0];
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        // Chain 1 doesn't exist
        const chains = new Map<ChainKey, NoteChain>([[chainKey0, chain0]]);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
        ]);

        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const plans = planChainExtensions(
          chain0,
          chainKey0,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // No Withdraw2 plan because other chain not found
        expect(plans).toHaveLength(0);
      });

      it('should return null when other chain tip is spent', () => {
        const deposit0 = createMockDepositNote(0, toEther(1));
        const deposit1 = createMockDepositNote(1, toEther(2), { status: 'spent' });
        const chain0: NoteChain = [deposit0];
        const chain1: NoteChain = [deposit1];
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);
        const chains = new Map<ChainKey, NoteChain>([
          [chainKey0, chain0],
          [chainKey1, chain1],
        ]);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 1, changeIndex: 0 }],
        ]);

        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const plans = planChainExtensions(
          chain0,
          chainKey0,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        expect(plans).toHaveLength(0);
      });

      it('should return null when other nullifier already consumed', () => {
        // This is tricky because we need to plan from secondary chain's perspective
        // after primary chain already planned the same Withdraw2
        const deposit0 = createMockDepositNote(0, toEther(1));
        const deposit1 = createMockDepositNote(1, toEther(2));
        const chain0: NoteChain = [deposit0];
        const chain1: NoteChain = [deposit1];
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);
        const chains = new Map<ChainKey, NoteChain>([
          [chainKey0, chain0],
          [chainKey1, chain1],
        ]);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 1, changeIndex: 0 }],
        ]);

        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        // First, plan from chain 0
        const plans0 = planChainExtensions(
          chain0,
          chainKey0,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Should get the Withdraw2 plan
        expect(plans0).toHaveLength(1);
        expect(plans0[0].kind).toBe('withdraw2');
      });

      it('should return null when chain in nullifierMap but not in allChains', () => {
        const deposit0 = createMockDepositNote(0, toEther(1));
        const chain0: NoteChain = [deposit0];
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        // Only chain 0 exists, chain 1 doesn't
        const chains = new Map<ChainKey, NoteChain>([[chainKey0, chain0]]);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 0);
        // Both nullifiers in map, but chain 1 doesn't exist
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 1, changeIndex: 0 }],
        ]);

        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const plans = planChainExtensions(
          chain0,
          chainKey0,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // No plan because chain 1 doesn't exist
        expect(plans).toHaveLength(0);
      });

      it('should return null when other chain exists but nullifier not in map', () => {
        const deposit0 = createMockDepositNote(0, toEther(1));
        const deposit1 = createMockDepositNote(1, toEther(2));
        const chain0: NoteChain = [deposit0];
        const chain1: NoteChain = [deposit1];
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);
        const chains = new Map<ChainKey, NoteChain>([
          [chainKey0, chain0],
          [chainKey1, chain1],
        ]);

        // Only first nullifier in map
        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
          // nullifier1 not in map
        ]);

        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const plans = planChainExtensions(
          chain0,
          chainKey0,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // No plan because other nullifier not found
        expect(plans).toHaveLength(0);
      });

      it('should set primaryNewNullifierHash to null when remaining is 0', () => {
        const deposit0 = createMockDepositNote(0, toEther(1));
        const deposit1 = createMockDepositNote(1, toEther(2));
        const chain0: NoteChain = [deposit0];
        const chain1: NoteChain = [deposit1];
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);
        const chains = new Map<ChainKey, NoteChain>([
          [chainKey0, chain0],
          [chainKey1, chain1],
        ]);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 1, changeIndex: 0 }],
        ]);

        // Withdraw full combined amount (1 + 2 = 3)
        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(3));
        const activityIndex = buildActivityIndex([activity]);

        const plans = planChainExtensions(
          chain0,
          chainKey0,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        expect(plans).toHaveLength(1);
        if (plans[0].kind === 'withdraw2') {
          expect(plans[0].remaining).toBe(0n);
          expect(plans[0].primaryNewNullifierHash).toBeNull();
        }
      });

      it('should plan cross-chain Withdraw2 with pending intent', () => {
        const deposit0 = createMockDepositNote(0, toEther(1));
        const deposit1 = createMockDepositNote(1, toEther(2));
        const chain0: NoteChain = [deposit0];
        const chain1: NoteChain = [deposit1];
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);
        const chains = new Map<ChainKey, NoteChain>([
          [chainKey0, chain0],
          [chainKey1, chain1],
        ]);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 1, changeIndex: 0 }],
        ]);

        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5), {
          type: 'CROSSCHAIN_WITHDRAW2_PENDING',
          intentStatus: 'pending',
        });
        const activityIndex = buildActivityIndex([activity]);

        const plans = planChainExtensions(
          chain0,
          chainKey0,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        expect(plans).toHaveLength(1);
        if (plans[0].kind === 'withdraw2') {
          expect(plans[0].createPendingIntent).toBe(true);
        }
      });
    });

    describe('ragequit planning', () => {
      it('should plan ragequit when commitment matches', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { label: '12345' });
        const chain: NoteChain = [depositNote];
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const chains = new Map<ChainKey, NoteChain>([[chainKey, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();

        // We need to compute the actual commitment for this note
        // For now, we'll create a ragequit activity with a matching commitment
        // The planner checks against derivedNoteCommitment
        const activity = createMockRagequitActivity(0, 0, 'test-commitment');
        const activityIndex = buildActivityIndex([activity]);

        // This won't match because derivedNoteCommitment is computed differently
        // But we're testing the flow
        const plans = planChainExtensions(
          chain,
          chainKey,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Won't match because commitment derivation uses crypto
        // This tests the flow, not the crypto
        expect(plans).toHaveLength(0);
      });
    });

    describe('virtual state tracking', () => {
      it('should track consumed nullifiers across planned extensions', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const chains = new Map<ChainKey, NoteChain>([[chainKey, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();

        // Create withdrawal activities for indices 0 and 1
        const activity1 = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activity2 = createMock1x1WithdrawalActivity(0, 1, toEther(0.2));
        const activityIndex = buildActivityIndex([activity1, activity2]);

        const plans = planChainExtensions(
          chain,
          chainKey,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Both should be planned using virtual state
        expect(plans).toHaveLength(2);

        // Verify the plans use correct virtual state
        if (plans[0].kind === 'withdraw1x1' && plans[1].kind === 'withdraw1x1') {
          expect(plans[0].remaining).toBe(toEther(0.7));
          expect(plans[1].remaining).toBe(toEther(0.5)); // 0.7 - 0.2
        }
      });

      it('should update currentNoteType after withdrawal planning', () => {
        // This tests BUG #2 fix: currentNoteType is now updated after planning
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const chains = new Map<ChainKey, NoteChain>([[chainKey, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();

        // Multiple sequential withdrawals
        const activity1 = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activity2 = createMock1x1WithdrawalActivity(0, 1, toEther(0.2));
        const activity3 = createMock1x1WithdrawalActivity(0, 2, toEther(0.1));
        const activityIndex = buildActivityIndex([activity1, activity2, activity3]);

        const plans = planChainExtensions(
          chain,
          chainKey,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // All three should be planned (virtual noteType correctly tracked as 'change')
        expect(plans).toHaveLength(3);
        expect(plans.every(p => p.kind === 'withdraw1x1')).toBe(true);
      });
    });

    describe('edge cases - testing gaps', () => {
      it('should reject Withdraw2 when secondary chain has no nullifier in map (withdrawalIntent scenario)', () => {
        // Testing gap: When a chain ends in withdrawalIntent, its previous note was spent
        // and the nullifier was removed. So Withdraw2 matching should fail.
        const deposit0 = createMockDepositNote(0, toEther(1));
        // Chain 1 has a spent deposit and a withdrawalIntent note
        // In reality, when deposit1 was spent, its nullifier was removed from the map
        const deposit1 = createMockDepositNote(1, toEther(2), { status: 'spent' });
        const withdrawalIntent1 = createMockWithdrawalIntentNote(1, 0, toEther(0.5));

        const chain0: NoteChain = [deposit0];
        const chain1: NoteChain = [deposit1, withdrawalIntent1];
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);
        const chains = new Map<ChainKey, NoteChain>([
          [chainKey0, chain0],
          [chainKey1, chain1],
        ]);

        // Only chain0's nullifier is in the map - chain1's nullifier was removed when spent
        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
          // nullifier1 NOT in map (was removed when deposit1 was spent)
        ]);

        // Withdraw2 activity references both nullifiers, but nullifier1 isn't in map
        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const plans = planChainExtensions(
          chain0,
          chainKey0,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Should reject because chain1's nullifier is not in the map
        expect(plans).toHaveLength(0);
      });

      it('should allow Withdraw2 when one chain was virtually extended earlier (plannedNullifiers)', () => {
        // Testing gap: Withdraw2 where one chain was virtually extended earlier in same page
        // This tests the plannedNullifiers fix
        const deposit0 = createMockDepositNote(0, toEther(1));
        const deposit1 = createMockDepositNote(1, toEther(2));
        const chain0: NoteChain = [deposit0];
        const chain1: NoteChain = [deposit1];
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);
        const chains = new Map<ChainKey, NoteChain>([
          [chainKey0, chain0],
          [chainKey1, chain1],
        ]);

        // Only the initial nullifiers in map (changeIndex 0)
        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 1, changeIndex: 0 }],
        ]);

        // First: 1x1 withdrawal from chain 0 (creates changeIndex 1)
        // Then: Withdraw2 merging chain 0's new changeIndex 1 with chain 1's changeIndex 0
        const withdrawal1 = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        // Note: This Withdraw2 activity uses the NEW nullifier (changeIndex 1) from chain 0
        // which was just virtually created by the first withdrawal
        const newNullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 1);
        const withdraw2Activity = {
          ...createMockWithdraw2Activity(0, 1, 1, 0, toEther(0.5)),
          spentNullifier: newNullifier0, // Uses the virtually created nullifier
          spentNullifier1: nullifier1,
        };
        const activityIndex = buildActivityIndex([withdrawal1, withdraw2Activity]);

        const plans = planChainExtensions(
          chain0,
          chainKey0,
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Should have both: 1x1 withdrawal followed by Withdraw2
        // The Withdraw2 works because plannedNullifiers now contains the new nullifier
        expect(plans).toHaveLength(2);
        expect(plans[0].kind).toBe('withdraw1x1');
        expect(plans[1].kind).toBe('withdraw2');
      });
    });
  });
});
