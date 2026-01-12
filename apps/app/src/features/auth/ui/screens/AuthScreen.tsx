"use client";

/**
 * Auth Screen
 * Declarative router for authentication UI
 */

import { useEffect, useRef } from "react";
import { WalletAuth } from "../components/WalletAuth";
import { AuthController } from "@/controllers/AuthController";
import { useSnapshot } from "valtio";

export function AuthScreen() {
  const state = useSnapshot(AuthController.state);

  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    AuthController.bootstrap();
  }, []);

  switch (state.state.status) {
    case "booting":
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-orange-500" />
          <h2 className="text-lg font-semibold text-white">Initializing...</h2>
        </div>
      );

    case "unauthenticated":
      return <WalletAuth />;

    case "authenticated":
      return null;

    default:
      return null;
  }
}
