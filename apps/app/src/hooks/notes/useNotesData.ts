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

  const poolAddress = SHINOBI_CASH_ETH_POOL.address;

  // Always call useNotes to maintain hook order, but skip if not authenticated
  const {
    data: noteDiscovery,
    loading,
    error,
    progress,
    refresh,
  } = useNotes(
    publicKey || "",
    poolAddress,
    accountKey || BigInt(0),
    { autoScan: !!publicKey && !!accountKey }
  );

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
    if (!publicKey || !accountKey) return;
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Return empty data if not authenticated (but all hooks were called)
  if (!publicKey || !accountKey) {
    return {
      noteChains: [],
      unspentNotesCount: 0,
      totalNotesCount: 0,
      loading: false,
      error: null,
      progress: null,
      isRefreshing: false,
      noteDiscovery: null,
      handleRefresh,
    };
  }

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
