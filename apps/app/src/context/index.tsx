// file: shinobi-cash-website/apps/app/src/context/index.tsx
"use client";

import { wagmiAdapter } from "@/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./ThemeContext";
import { SettingsProvider } from "./SettingsContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";
import { Toaster } from "@workspace/ui/components/sonner";
import { RuntimeBootstrap } from "./RuntimeBootstrap";

// Set up queryClient
const queryClient = new QueryClient();

// Modal is now lazy-loaded via @/lib/wallet/modal
// Import openWalletModal from there instead of using modal.open()

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <SettingsProvider>
          <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
            <QueryClientProvider client={queryClient}>
              <RuntimeBootstrap />
              {children}
              <Toaster />
            </QueryClientProvider>
          </WagmiProvider>
        </SettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default ContextProvider;
