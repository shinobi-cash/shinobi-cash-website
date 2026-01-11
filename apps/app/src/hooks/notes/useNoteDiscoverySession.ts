"use client";

import { useEffect } from "react";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { useNoteDiscovery } from "./useNoteDiscovery";
import { useCryptoContext } from "@/hooks/useCryptoContext";

export function useNoteDiscoverySession() {
  const { onTransactionIndexed } = useTransactionTracking();
  const poolAddress = SHINOBI_CASH_ETH_POOL.address;

  const { publicKey, accountKey, cryptoReady } = useCryptoContext();

  const discovery = useNoteDiscovery(
    publicKey ?? "",
    poolAddress,
    accountKey ?? BigInt(0),
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
