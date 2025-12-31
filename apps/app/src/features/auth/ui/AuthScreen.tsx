/**
 * Auth Screen
 * Main declarative router for authentication UI
 * Switches on state.status to render appropriate screen
 */

"use client";

import { useEffect } from "react";
import { useAuthState, useAuthActions } from "../hooks/useAuthStore";
import { BootingScreen } from "./screens/BootingScreen";
import { NoAccountsScreen } from "./screens/NoAccountsScreen";
import { AccountsDetectedScreen } from "./screens/AccountsDetectedScreen";
import { CreatingAccountScreen } from "./screens/CreatingAccountScreen";
import { AuthenticatingScreen } from "./screens/AuthenticatingScreen";
import { WalletAuthHandler } from "./screens/WalletAuthHandler";
import { ErrorScreen } from "./screens/ErrorScreen";

export function AuthScreen() {
  const state = useAuthState();
  const actions = useAuthActions();

  // Bootstrap on mount
  useEffect(() => {
    actions.bootstrap();
  }, [actions]);

  // Declarative UI - switch on state.status
  switch (state.status) {
    case "booting":
      return <BootingScreen />;

    case "no-accounts":
      return (
        <NoAccountsScreen
          onCreateAccount={(method) => {
            actions.startAccountCreation(method);
            // TODO: Trigger actual account creation flow
            // This will be connected to existing auth components
          }}
        />
      );

    case "accounts-detected":
      return (
        <AccountsDetectedScreen
          accounts={state.accounts}
          onSelectAccount={(accountId, method) => {
            actions.selectAccount(accountId, method);
            // TODO: Trigger actual authentication flow
            // This will be connected to existing auth components
          }}
          onCreateNew={() => {
            // Transition back to no-accounts to show creation options
            // This is a temporary solution - ideally we'd have a dedicated state
            actions.bootstrap();
          }}
        />
      );

    case "creating-account":
      return <CreatingAccountScreen method={state.method} />;

    case "authenticating":
      // For wallet, use WalletAuthHandler to trigger signing
      if (state.method === "wallet") {
        return <WalletAuthHandler accountId={state.accountId} />;
      }
      // For passkey, just show loading (auth happens in store)
      return <AuthenticatingScreen method={state.method} accountId={state.accountId} />;

    case "authenticated":
      // When authenticated, don't show auth screen
      // This state is handled by the app layout
      return null;

    case "error":
      return (
        <ErrorScreen
          error={state.error}
          retry={state.retry}
          onClear={actions.clearError}
        />
      );
  }

  // Exhaustiveness check - should never reach here
  return <BootingScreen />;
}
