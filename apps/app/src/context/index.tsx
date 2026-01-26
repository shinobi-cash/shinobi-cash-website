// file: shinobi-cash-website/apps/app/src/context/index.tsx
"use client";

import { wagmiAdapter, projectId, networks } from "@/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";
import { Toaster } from "@workspace/ui/components/sonner";
import { RuntimeBootstrap } from "./RuntimeBootstrap";

// Set up queryClient
const queryClient = new QueryClient();

// Set up metadata
const metadata = {
  name: "Shinobi Cash",
  description: "One click, borderless and complaint privacy",
  url: "https://shinobi.cash",
  icons: ["https://shinobi.cash/icon.svg"],
};

// Create the modal
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata,
  themeMode: "dark",
  features: {
    analytics: true,
    email:false,
    onramp:false,
    connectMethodsOrder:['wallet'],
    emailShowWallets:false,
    history:false,
    receive:false,
    reownAuthentication:false,
    send:false,
    socials:false,
    swaps:false,
  },
  themeVariables: {
    "--w3m-accent": "#f97316",
  },
});

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
