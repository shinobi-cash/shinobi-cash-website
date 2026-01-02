/**
 * Auth Screen
 * Main declarative router for authentication UI
 * Simplified: Wallet-only authentication with passkey as convenience unlock
 */

"use client";

import { useEffect, useRef } from "react";
import { useAuthState, useAuthActions } from "../hooks/useAuthStore";
import { BootingScreen } from "./screens/BootingScreen";
import { UnauthenticatedScreen } from "./screens/UnauthenticatedScreen";
import { WalletSignInHandler } from "./screens/WalletSignInHandler";
import { ErrorScreen } from "./screens/ErrorScreen";

export function AuthScreen() {
  const state = useAuthState();
  const actions = useAuthActions();
  const bootstrapCalled = useRef(false);

  // Bootstrap on mount (once only)
  useEffect(() => {
    if (!bootstrapCalled.current) {
      bootstrapCalled.current = true;
      actions.bootstrap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Declarative UI - switch on state.status
  switch (state.status) {
    case "booting":
      return <BootingScreen />;

    case "unauthenticated":
      // Single entry point: Sign in with Wallet
      return (
        <UnauthenticatedScreen
          onSignInWithWallet={() => {
            actions.startWalletSignIn();
          }}
        />
      );

    case "signing-in":
      // Wallet signature in progress (tries login first, creates if needed)
      return <WalletSignInHandler />;

    case "authenticated":
      // When authenticated, don't show auth screen
      // This state is handled by the app layout
      return null;

    case "error":
      return <ErrorScreen error={state.error} retry={state.retry} onClear={actions.clearError} />;
  }
}
