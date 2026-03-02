/**
 * Note Selection Tests
 */

import { describe, it, expect } from "vitest";
import type { Note, DepositNote } from "../src/discovery-v2/types.js";
import {
  selectSingleNote,
  selectTwoNotes,
  selectNotesForWithdrawal,
  isWithdraw2Selection,
  getTotalInputAmount,
  getChangeNoteLabel,
} from "../src/withdrawal/note-selection.js";

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockNote(overrides: Partial<Note> = {}): Note {
  return {
    poolAddress: "0x1234567890123456789012345678901234567890",
    depositIndex: 0,
    changeIndex: 0,
    amount: "1000000000000000000", // 1 ETH
    label: "test-label",
    status: "unspent",
    noteType: "deposit",
    precommitmentHash: "0xprecommit",
    blockNumber: "1000",
    timestamp: "1234567890",
    originTransactionHash: "0xtx",
    originChainId: "421614",
    aspStatus: "approved",
    activityData: {},
    ...overrides,
  } as Note;
}

// ============================================================================
// Single Note Selection Tests
// ============================================================================

describe("selectSingleNote", () => {
  it("should select a note with sufficient balance", () => {
    const note = createMockNote({ amount: "1000000000000000000" }); // 1 ETH
    const withdrawAmount = 500000000000000000n; // 0.5 ETH

    const result = selectSingleNote(note, withdrawAmount);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.selection.type).toBe("standard");
      expect(result.selection.withdrawAmount).toBe(withdrawAmount);
      expect(result.selection.changeAmount).toBe(500000000000000000n);
    }
  });

  it("should select a note for exact amount withdrawal", () => {
    const note = createMockNote({ amount: "1000000000000000000" });
    const withdrawAmount = 1000000000000000000n;

    const result = selectSingleNote(note, withdrawAmount);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.selection.changeAmount).toBe(0n);
    }
  });

  it("should reject insufficient balance", () => {
    const note = createMockNote({ amount: "500000000000000000" }); // 0.5 ETH
    const withdrawAmount = 1000000000000000000n; // 1 ETH

    const result = selectSingleNote(note, withdrawAmount);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INSUFFICIENT_BALANCE");
    }
  });

  it("should reject spent notes", () => {
    const note = createMockNote({ status: "spent" });
    const withdrawAmount = 500000000000000000n;

    const result = selectSingleNote(note, withdrawAmount);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOTE_NOT_SPENDABLE");
    }
  });

  it("should reject merged notes", () => {
    const note = createMockNote({ status: "merged" });
    const withdrawAmount = 500000000000000000n;

    const result = selectSingleNote(note, withdrawAmount);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOTE_NOT_SPENDABLE");
    }
  });

  it("should reject zero-balance notes", () => {
    const note = createMockNote({ amount: "0" });
    const withdrawAmount = 500000000000000000n;

    const result = selectSingleNote(note, withdrawAmount);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOTE_NOT_SPENDABLE");
    }
  });
});

// ============================================================================
// Two Note Selection Tests (Withdraw2)
// ============================================================================

describe("selectTwoNotes", () => {
  it("should select two notes with latest deposit as primary", () => {
    const note1 = createMockNote({
      depositIndex: 0,
      amount: "500000000000000000",
      label: "label-0",
    });
    const note2 = createMockNote({
      depositIndex: 1,
      amount: "700000000000000000",
      label: "label-1",
    });
    const withdrawAmount = 800000000000000000n;

    const result = selectTwoNotes(note1, note2, withdrawAmount);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.selection.type).toBe("withdraw2");
      if (result.selection.type === "withdraw2") {
        // Note with depositIndex 1 should be primary (latest)
        expect(result.selection.primaryInput.depositIndex).toBe(1);
        expect(result.selection.secondaryInput.depositIndex).toBe(0);
        expect(result.selection.withdrawAmount).toBe(withdrawAmount);
        // 0.5 + 0.7 - 0.8 = 0.4 ETH
        expect(result.selection.changeAmount).toBe(400000000000000000n);
        expect(result.selection.labelSelector).toBe(0);
      }
    }
  });

  it("should handle notes in reverse order", () => {
    // Pass note with larger depositIndex first
    const note1 = createMockNote({ depositIndex: 5, amount: "300000000000000000" });
    const note2 = createMockNote({ depositIndex: 2, amount: "400000000000000000" });
    const withdrawAmount = 500000000000000000n;

    const result = selectTwoNotes(note1, note2, withdrawAmount);

    expect(result.success).toBe(true);
    if (result.success && result.selection.type === "withdraw2") {
      // Note with depositIndex 5 should still be primary
      expect(result.selection.primaryInput.depositIndex).toBe(5);
      expect(result.selection.secondaryInput.depositIndex).toBe(2);
    }
  });

  it("should reject insufficient combined balance", () => {
    const note1 = createMockNote({ depositIndex: 0, amount: "300000000000000000" });
    const note2 = createMockNote({ depositIndex: 1, amount: "400000000000000000" });
    const withdrawAmount = 1000000000000000000n; // More than combined

    const result = selectTwoNotes(note1, note2, withdrawAmount);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INSUFFICIENT_BALANCE");
    }
  });

  it("should reject same note twice", () => {
    const note = createMockNote({ depositIndex: 0, changeIndex: 0 });
    const withdrawAmount = 500000000000000000n;

    const result = selectTwoNotes(note, note, withdrawAmount);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("SAME_NOTE");
    }
  });

  it("should reject if first note is not spendable", () => {
    const note1 = createMockNote({ depositIndex: 0, status: "spent" });
    const note2 = createMockNote({ depositIndex: 1 });
    const withdrawAmount = 500000000000000000n;

    const result = selectTwoNotes(note1, note2, withdrawAmount);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOTE_NOT_SPENDABLE");
    }
  });

  it("should reject if second note is not spendable", () => {
    const note1 = createMockNote({ depositIndex: 0 });
    const note2 = createMockNote({ depositIndex: 1, status: "merged" });
    const withdrawAmount = 500000000000000000n;

    const result = selectTwoNotes(note1, note2, withdrawAmount);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOTE_NOT_SPENDABLE");
    }
  });
});

// ============================================================================
// selectNotesForWithdrawal Tests
// ============================================================================

describe("selectNotesForWithdrawal", () => {
  it("should handle single note", () => {
    const note = createMockNote({ amount: "1000000000000000000" });
    const result = selectNotesForWithdrawal([note], 500000000000000000n);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.selection.type).toBe("standard");
    }
  });

  it("should handle two notes", () => {
    const note1 = createMockNote({ depositIndex: 0, amount: "500000000000000000" });
    const note2 = createMockNote({ depositIndex: 1, amount: "500000000000000000" });
    const result = selectNotesForWithdrawal([note1, note2], 800000000000000000n);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.selection.type).toBe("withdraw2");
    }
  });

  it("should reject empty notes array", () => {
    const result = selectNotesForWithdrawal([], 500000000000000000n);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INVALID_NOTES");
    }
  });

  it("should reject more than 2 notes", () => {
    const notes = [
      createMockNote({ depositIndex: 0 }),
      createMockNote({ depositIndex: 1 }),
      createMockNote({ depositIndex: 2 }),
    ];
    const result = selectNotesForWithdrawal(notes, 500000000000000000n);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INVALID_NOTES");
    }
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe("Utility Functions", () => {
  it("isWithdraw2Selection should correctly identify selection type", () => {
    const note1 = createMockNote({ depositIndex: 0, amount: "500000000000000000" });
    const note2 = createMockNote({ depositIndex: 1, amount: "500000000000000000" });

    const singleResult = selectSingleNote(note1, 300000000000000000n);
    const twoResult = selectTwoNotes(note1, note2, 800000000000000000n);

    if (singleResult.success) {
      expect(isWithdraw2Selection(singleResult.selection)).toBe(false);
    }
    if (twoResult.success) {
      expect(isWithdraw2Selection(twoResult.selection)).toBe(true);
    }
  });

  it("getTotalInputAmount should return correct amount", () => {
    const note1 = createMockNote({ depositIndex: 0, amount: "500000000000000000" });
    const note2 = createMockNote({ depositIndex: 1, amount: "700000000000000000" });

    const singleResult = selectSingleNote(note1, 300000000000000000n);
    const twoResult = selectTwoNotes(note1, note2, 800000000000000000n);

    if (singleResult.success) {
      expect(getTotalInputAmount(singleResult.selection)).toBe(500000000000000000n);
    }
    if (twoResult.success) {
      expect(getTotalInputAmount(twoResult.selection)).toBe(1200000000000000000n);
    }
  });

  it("getChangeNoteLabel should return correct label", () => {
    const note1 = createMockNote({ depositIndex: 0, label: "label-older" });
    const note2 = createMockNote({ depositIndex: 1, label: "label-latest" });

    const singleResult = selectSingleNote(note1, 300000000000000000n);
    const twoResult = selectTwoNotes(note1, note2, 800000000000000000n);

    if (singleResult.success) {
      expect(getChangeNoteLabel(singleResult.selection)).toBe("label-older");
    }
    if (twoResult.success) {
      // Default labelSelector is 0 (primary = latest deposit)
      expect(getChangeNoteLabel(twoResult.selection)).toBe("label-latest");
    }
  });
});
