"use client";

import { useEffect, useRef, useState } from "react";
import { parseUserKey } from "@shinobi-cash/core";
import { accountService } from "@/lib/storage/account/AccountService";

/**
 * Shared hook for loading crypto context (public key + account key) from storage.
 * This hook ensures consistent crypto loading across all features.
 *
 * @returns Object containing publicKey, accountKey, and cryptoReady flag
 */
export function useCryptoContext() {
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
        const accountData = await accountService.getAccountData();
        if (!accountData || cancelled) return;

        cryptoRef.current = {
          publicKey: accountData.publicKey ?? null,
          accountKey: parseUserKey(accountData.privateKey),
        };

        setCryptoReady(true);
      } catch (err) {
        console.warn("[CryptoContext] Failed to load crypto context:", err);
      }
    }

    loadCrypto();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    publicKey: cryptoRef.current.publicKey,
    accountKey: cryptoRef.current.accountKey,
    cryptoReady,
  };
}
