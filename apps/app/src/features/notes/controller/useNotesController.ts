/**
 * Notes Controller
 * Main orchestrator for the notes feature
 * Coordinates all child hooks and owns the state machine
 */

import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { storageManager } from "@/lib/storage";
import { parseUserKey } from "@shinobi-cash/core";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import type { Note } from "@shinobi-cash/core";
import type { NotesStatus, NotesError, NoteFilter, NoteChainView } from "../types";
import { useNoteDiscovery } from "../hooks/useNoteDiscovery";
import { useNoteFilter } from "../hooks/useNoteFilter";
import {
  filterNoteChains,
  getNoteChainCounts,
  sortNoteChainsByTimestamp,
  getAvailableNotes,
  getLastNote,
} from "../protocol/noteFiltering";

// ============ TYPES ============

export interface NotesController {
  status: NotesStatus;
  lastError: NotesError;

  filteredNoteViews: NoteChainView[];

  activeFilter: NoteFilter;
  availableCount: number;
  pendingCount: number;
  spentCount: number;
  totalCount: number;

  isLoading: boolean;
  isRefreshing: boolean;

  availableNotes: Note[];

  setFilter: (filter: NoteFilter) => void;
  refresh: () => Promise<void>;
  reset: () => void;
}

// ============ CONTROLLER ============

export function useNotesController(): NotesController {
  const { onTransactionIndexed } = useTransactionTracking();
  const poolAddress = SHINOBI_CASH_ETH_POOL.address;

  // ---------- CRYPTO CONTEXT (SOURCE OF TRUTH) ----------
  const cryptoRef = useRef<{
    publicKey: string | null;
    accountKey: bigint | null;
  }>({
    publicKey: null,
    accountKey: null,
  });

  const [cryptoReady, setCryptoReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCrypto() {
      try {
        const accountData = await storageManager.getAccountData();
        if (!accountData || cancelled) return;

        cryptoRef.current = {
          publicKey: accountData.publicKey ?? null,
          accountKey: parseUserKey(accountData.privateKey),
        };

        setCryptoReady(true);
      } catch (err) {
        console.warn("[NotesController] Failed to load crypto context:", err);
      }
    }

    loadCrypto();
    return () => {
      cancelled = true;
    };
  }, []);

  const publicKey = cryptoRef.current.publicKey;
  const accountKey = cryptoRef.current.accountKey;

  // ============ CHILD HOOKS ============

  const discovery = useNoteDiscovery(
    publicKey ?? "",
    poolAddress,
    accountKey ?? BigInt(0),
    cryptoReady
  );

  const { refresh: refreshDiscovery } = discovery;
  const filter = useNoteFilter("available");

  // ============ DERIVED STATE ============

  const noteChains = useMemo(() => {
    if (!discovery.data?.notes) return [];
    return discovery.data.notes;
  }, [discovery.data]);

  const sortedNoteChains = useMemo(() => {
    return sortNoteChainsByTimestamp(noteChains);
  }, [noteChains]);

  const filteredNoteChains = useMemo(() => {
    return filterNoteChains(sortedNoteChains, filter.activeFilter);
  }, [sortedNoteChains, filter.activeFilter]);

  const filteredNoteViews = useMemo((): NoteChainView[] => {
    return filteredNoteChains.map((chain, index) => {
      const lastNote = getLastNote(chain);
      return {
        chain,
        lastNote,
        length: chain.length,
        key: `chain-${index}-${lastNote.depositIndex}-${lastNote.changeIndex}`,
      };
    });
  }, [filteredNoteChains]);

  const counts = useMemo(() => {
    return getNoteChainCounts(noteChains);
  }, [noteChains]);

  const availableNotes = useMemo(() => {
    return getAvailableNotes(noteChains);
  }, [noteChains]);

  const lastError: NotesError = discovery.discoveryError
    ? { type: "discovery", message: discovery.discoveryError }
    : null;

  // ============ STATUS MACHINE ============

  const getStatus = useCallback((): NotesStatus => {
    if (!cryptoReady) return "idle";
    if (discovery.discoveryError) return "error";
    if (discovery.isDiscovering && !discovery.data) return "loading";
    if (noteChains.length === 0) return "empty";
    return "ready";
  }, [
    cryptoReady,
    discovery.discoveryError,
    discovery.isDiscovering,
    discovery.data,
    noteChains.length,
  ]);

  const status = getStatus();

  // ============ AUTO-REFRESH ON TX INDEXED ============

  useEffect(() => {
    const cleanup = onTransactionIndexed(() => {
      refreshDiscovery();
    });
    return cleanup;
  }, [onTransactionIndexed, refreshDiscovery]);

  // ============ ACTIONS ============

  const refresh = useCallback(async () => {
    if (!cryptoReady) return;
    await refreshDiscovery();
  }, [cryptoReady, refreshDiscovery]);

  const reset = useCallback(() => {
    filter.reset();
  }, [filter]);

  // ============ RETURN ============

  return {
    status,
    lastError,

    filteredNoteViews,

    activeFilter: filter.activeFilter,
    availableCount: counts.available,
    pendingCount: counts.pending,
    spentCount: counts.spent,
    totalCount: noteChains.length,

    isLoading: discovery.isDiscovering && !discovery.data,
    isRefreshing: discovery.isDiscovering && !!discovery.data,

    availableNotes,

    setFilter: filter.setFilter,
    refresh,
    reset,
  };
}
