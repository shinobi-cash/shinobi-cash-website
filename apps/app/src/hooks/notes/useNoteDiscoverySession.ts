"use client";

import { useEffect, useRef, useState } from "react";
import { storageManager } from "@/lib/storage";
import { parseUserKey } from "@shinobi-cash/core";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { useNoteDiscovery } from "./useNoteDiscovery";

export function useNoteDiscoverySession() {
  const { onTransactionIndexed } = useTransactionTracking();
  const poolAddress = SHINOBI_CASH_ETH_POOL.address;

  const cryptoRef = useRef<{
    publicKey: string | null;
    accountKey: bigint | null;
  }>({ publicKey: null, accountKey: null });

  const [cryptoReady, setCryptoReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const account = await storageManager.getAccountData();
        if (!account || cancelled) return;

        cryptoRef.current = {
          publicKey: account.publicKey ?? null,
          accountKey: parseUserKey(account.privateKey),
        };

        setCryptoReady(true);
      } catch (err) {
        console.warn("[NoteDiscoverySession] Failed to load crypto", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const discovery = useNoteDiscovery(
    cryptoRef.current.publicKey ?? "",
    poolAddress,
    cryptoRef.current.accountKey ?? BigInt(0),
    cryptoReady
  );

  useEffect(() => {
    return onTransactionIndexed(() => {
      discovery.refresh();
    });
  }, [onTransactionIndexed, discovery]);

  return {
    cryptoReady,
    discovery,
  };
}
