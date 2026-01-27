"use client";

import { useEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { AppRuntime } from "@/runtime/AppRuntime";
import { AuthController } from "@/controllers/AuthController";

/**
 * Runtime Bootstrap Component
 * Single entry point for app lifecycle management
 */
export function RuntimeBootstrap() {
  const authState = useSnapshot(AuthController.state);
  const { cryptoReady } = authState.crypto;
  const prevCryptoReady = useRef(cryptoReady);

  // Start runtime on mount
  useEffect(() => {
    AppRuntime.start();

    return () => {
      AppRuntime.stop();
    };
  }, []);

  // React to crypto state changes
  useEffect(() => {
    const wasCryptoReady = prevCryptoReady.current;
    prevCryptoReady.current = cryptoReady;

    // Crypto became ready (login) → bootstrap notes
    if (!wasCryptoReady && cryptoReady) {
      AppRuntime.onCryptoReady();
    }

    // Crypto became unavailable (logout) → cleanup notes and workers
    if (wasCryptoReady && !cryptoReady) {
      AppRuntime.onLogout();
    }
  }, [cryptoReady]);

  return null;
}
