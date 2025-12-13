// File: src/hooks/useNotesData.ts

import { useAuth } from "@/contexts/AuthContext";
import { useNotes } from "@/hooks/notes/useNoteDiscovery";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { useEffect, useMemo, useState } from "react";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";

export function useNotesData() {
  const { publicKey, accountKey } = useAuth();
  const { onTransactionIndexed } = useTransactionTracking();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Guard clause: Early return if auth keys are not present.
  if (!publicKey || !accountKey) {
    return {
      noteChains: [],
      unspentNotesCount: 0,
      totalNotesCount: 0,
      loading: true,
      error: null,
      progress: null,
      isRefreshing: false,
      noteDiscovery: null,
      handleRefresh: () => Promise.resolve(),
    };
  }

  const poolAddress = SHINOBI_CASH_ETH_POOL.address;

  const {
    data: noteDiscovery,
    loading,
    error,
    progress,
    refresh,
  } = useNotes(publicKey, poolAddress, accountKey, { autoScan: true });

  useEffect(() => {
    const cleanup = onTransactionIndexed(() => {
      refresh();
    });
    return cleanup;
  }, [onTransactionIndexed, refresh]);

  const noteChains = useMemo(() => {
    if (!noteDiscovery?.notes) return [];
    return noteDiscovery.notes.sort((a, b) => {
      const lastNoteA = a[a.length - 1];
      const lastNoteB = b[b.length - 1];
      return Number(lastNoteB.timestamp) - Number(lastNoteA.timestamp);
    });
  }, [noteDiscovery]);

  const unspentNotesCount = useMemo(() => {
    return noteChains.filter((noteChain) => {
      const lastNote = noteChain[noteChain.length - 1];
      return lastNote.status === "unspent" && lastNote.isActivated; // Only count activated notes
    }).length;
  }, [noteChains]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    noteChains,
    unspentNotesCount,
    totalNotesCount: noteChains.length,
    loading,
    error,
    progress,
    isRefreshing,
    noteDiscovery,
    handleRefresh,
  };
}
