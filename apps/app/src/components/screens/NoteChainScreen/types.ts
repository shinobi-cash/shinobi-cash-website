/**
 * Types for NoteChainScreen components
 */

import type { Note } from "@shinobi-cash/core/discovery";

export interface CrossChainStep {
  label: string;
  txHash: string;
  txUrl: string;
  chainName: string;
  timestamp: string | bigint;
  dotColor: string;
}

export interface TimelineEntry {
  key: string;
  label: string;
  amount: bigint;
  prefix: "+" | "-" | "";
  dotColor: string;
  txHash: string;
  txUrl: string;
  timestamp: string | bigint;
  note: Note;
  fees?: {
    relayFee?: string;
    solverFee?: string;
    vettingFee?: string;
  };
  isMerged?: boolean;
  mergedIntoNoteIndex?: number;
  mergedFromNoteIndex?: number;
  crossChainSteps?: CrossChainStep[];
}
