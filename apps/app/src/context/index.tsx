// file: shinobi-cash-website/apps/app/src/context/index.tsx
"use client";

import { wagmiAdapter, projectId, networks } from "@/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SessionRestoreManager } from "@/components/SessionRestoreManager";
import { TransactionTrackingProvider } from "@/hooks/transactions/useTransactionTracking";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import React, { type ReactNode, useEffect } from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";
import { Toaster } from "@workspace/ui/components/sonner";
import { INDEXER_CONFIG } from "@/config/constants";
import { IndexerClient, setShinobiClient } from "@shinobi-cash/data";
import { Particles } from "@workspace/ui/components/particles";

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
  },
  themeVariables: {
    "--w3m-accent": "#f97316",
  },
});

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies);

  // Initialize indexer client on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const indexerClient = new IndexerClient({
        endpoint: INDEXER_CONFIG.ENDPOINT,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "shinobi-app/1.0.0",
          ...(INDEXER_CONFIG.TOKEN && { Authorization: `Bearer ${INDEXER_CONFIG.TOKEN}` }),
        },
        timeout: 30000,
      });

      setShinobiClient(indexerClient);
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <SessionRestoreManager>
                <TransactionTrackingProvider>
                  <Particles
                    className="pointer-events-none fixed inset-0"
                    quantity={100}
                    ease={80}
                    color="#f97316"
                    refresh={true}
                  />
                  {children}
                  <Toaster />
                </TransactionTrackingProvider>
              </SessionRestoreManager>
            </AuthProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default ContextProvider;
