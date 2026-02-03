/**
 * Note Selection for Withdrawals
 *
 * Validates manually selected notes and determines withdrawal type (1:1 or 2:1)
 */

import type { Note } from '../discovery/types.js';

// ============================================================================
// Types
// ============================================================================

export type WithdrawalType = 'standard' | 'withdraw2';

export interface SelectedNote {
  note: Note;
  depositIndex: number;
  changeIndex: number;
  amount: bigint;
  label: string;
}

export interface StandardWithdrawalSelection {
  type: 'standard';
  input: SelectedNote;
  withdrawAmount: bigint;
  changeAmount: bigint;
}

export interface Withdraw2Selection {
  type: 'withdraw2';
  /** Primary input - chain with latest depositIndex (continues after merge) */
  primaryInput: SelectedNote;
  /** Secondary input - chain with older depositIndex (merges into primary) */
  secondaryInput: SelectedNote;
  withdrawAmount: bigint;
  changeAmount: bigint;
  /** Which input's label to use for the change note (0 = primary, 1 = secondary) */
  labelSelector: 0 | 1;
}

export type WithdrawalSelection = StandardWithdrawalSelection | Withdraw2Selection;

export interface SelectionError {
  code: 'INSUFFICIENT_BALANCE' | 'NOTE_NOT_SPENDABLE' | 'INVALID_NOTES' | 'SAME_NOTE';
  message: string;
}

export type SelectionResult =
  | { success: true; selection: WithdrawalSelection }
  | { success: false; error: SelectionError };

// ============================================================================
// Validation
// ============================================================================

function isSpendable(note: Note): boolean {
  return note.status === 'unspent' && BigInt(note.amount) > 0n;
}

function toSelectedNote(note: Note): SelectedNote {
  return {
    note,
    depositIndex: note.depositIndex,
    changeIndex: note.changeIndex,
    amount: BigInt(note.amount),
    label: note.label,
  };
}

// ============================================================================
// Selection Functions
// ============================================================================

/**
 * Validate a single note for standard 1:1 withdrawal
 */
export function selectSingleNote(note: Note, withdrawAmount: bigint): SelectionResult {
  if (!isSpendable(note)) {
    return {
      success: false,
      error: {
        code: 'NOTE_NOT_SPENDABLE',
        message: `Note is not spendable (status: ${note.status}, amount: ${note.amount})`,
      },
    };
  }

  const noteAmount = BigInt(note.amount);
  if (noteAmount < withdrawAmount) {
    return {
      success: false,
      error: {
        code: 'INSUFFICIENT_BALANCE',
        message: `Note balance ${noteAmount} is less than withdrawal amount ${withdrawAmount}`,
      },
    };
  }

  return {
    success: true,
    selection: {
      type: 'standard',
      input: toSelectedNote(note),
      withdrawAmount,
      changeAmount: noteAmount - withdrawAmount,
    },
  };
}

/**
 * Validate two notes for 2:1 Withdraw2
 *
 * Automatically determines primary (latest deposit) and secondary (older deposit)
 */
export function selectTwoNotes(note1: Note, note2: Note, withdrawAmount: bigint): SelectionResult {
  // Validate both notes are spendable
  if (!isSpendable(note1)) {
    return {
      success: false,
      error: {
        code: 'NOTE_NOT_SPENDABLE',
        message: `First note is not spendable (status: ${note1.status}, amount: ${note1.amount})`,
      },
    };
  }

  if (!isSpendable(note2)) {
    return {
      success: false,
      error: {
        code: 'NOTE_NOT_SPENDABLE',
        message: `Second note is not spendable (status: ${note2.status}, amount: ${note2.amount})`,
      },
    };
  }

  // Ensure not the same note
  if (note1.depositIndex === note2.depositIndex && note1.changeIndex === note2.changeIndex) {
    return {
      success: false,
      error: {
        code: 'SAME_NOTE',
        message: 'Cannot use the same note twice',
      },
    };
  }

  const amount1 = BigInt(note1.amount);
  const amount2 = BigInt(note2.amount);
  const totalAmount = amount1 + amount2;

  if (totalAmount < withdrawAmount) {
    return {
      success: false,
      error: {
        code: 'INSUFFICIENT_BALANCE',
        message: `Combined balance ${totalAmount} is less than withdrawal amount ${withdrawAmount}`,
      },
    };
  }

  // Determine primary (latest deposit) and secondary (older deposit)
  const isPrimaryFirst = note1.depositIndex > note2.depositIndex;
  const primaryNote = isPrimaryFirst ? note1 : note2;
  const secondaryNote = isPrimaryFirst ? note2 : note1;

  // labelSelector: 0 = use primary's label, 1 = use secondary's label
  // Default: use primary's label (the continuing chain)
  const labelSelector = 0 as const;

  return {
    success: true,
    selection: {
      type: 'withdraw2',
      primaryInput: toSelectedNote(primaryNote),
      secondaryInput: toSelectedNote(secondaryNote),
      withdrawAmount,
      changeAmount: totalAmount - withdrawAmount,
      labelSelector,
    },
  };
}

/**
 * Select notes for withdrawal - determines type based on input count
 */
export function selectNotesForWithdrawal(notes: Note[], withdrawAmount: bigint): SelectionResult {
  if (notes.length === 0) {
    return {
      success: false,
      error: {
        code: 'INVALID_NOTES',
        message: 'At least one note must be provided',
      },
    };
  }

  if (notes.length === 1) {
    return selectSingleNote(notes[0]!, withdrawAmount);
  }

  if (notes.length === 2) {
    return selectTwoNotes(notes[0]!, notes[1]!, withdrawAmount);
  }

  return {
    success: false,
    error: {
      code: 'INVALID_NOTES',
      message: 'Maximum 2 notes can be selected for withdrawal',
    },
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a withdrawal selection is a Withdraw2 (2:1)
 */
export function isWithdraw2Selection(selection: WithdrawalSelection): selection is Withdraw2Selection {
  return selection.type === 'withdraw2';
}

/**
 * Get the total input amount for a selection
 */
export function getTotalInputAmount(selection: WithdrawalSelection): bigint {
  if (selection.type === 'standard') {
    return selection.input.amount;
  }
  return selection.primaryInput.amount + selection.secondaryInput.amount;
}

/**
 * Get the label that will be used for the change note
 */
export function getChangeNoteLabel(selection: WithdrawalSelection): string {
  if (selection.type === 'standard') {
    return selection.input.label;
  }
  return selection.labelSelector === 0
    ? selection.primaryInput.label
    : selection.secondaryInput.label;
}
