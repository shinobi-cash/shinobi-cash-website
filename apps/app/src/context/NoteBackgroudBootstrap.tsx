// file: apps/app/src/context/NotesBackgroundBootstrap.tsx
"use client";

import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";
import { AuthController } from "@/controllers/AuthController";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";

export function NotesBackgroundBootstrap() {
  // Subscribe to AuthController crypto state
  const authState = useSnapshot(AuthController.state);
  const { cryptoReady } = authState.crypto;

  useEffect(() => {
    if (!cryptoReady) return;

    // 1️⃣ Hydrate from cache immediately
    NotesDiscoveryController.bootstrap();

    // 2️⃣ Start background sync
    NotesDiscoveryController.startBackgroundSync(
      SHINOBI_CASH_ETH_POOL.address
    );

    return () => {
      NotesDiscoveryController.stopBackgroundSync();
    };
  }, [cryptoReady]);

  return null;
}
