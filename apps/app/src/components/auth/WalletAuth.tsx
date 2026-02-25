"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Wallet } from "lucide-react";
import { useAccount, useChainId, useSwitchChain, useSignTypedData, useDisconnect } from "wagmi";
import { openWalletModal } from "@/context/wallet";
import { AuthController } from "@/controllers/AuthController";
import { getShinobiAuthMessage } from "@/lib/auth";
import { showToast } from "@/lib/toast";
import { getUserMessage, isUserCancellation } from "@/lib/errors/errors";
import { POOL_CHAIN } from "@shinobi-cash/constants";

type Status = "idle" | "connecting" | "switching" | "signing" | "authenticating";

export function WalletAuth() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();
  const { disconnect } = useDisconnect();
  const [status, setStatus] = useState<Status>("idle");
  const pendingSignIn = useRef(false);

  const continueSignIn = useCallback(
    async (walletAddress: `0x${string}`) => {
      try {
        // Switch to pool chain if not already on it (required for EIP-712 signature)
        if (chainId !== POOL_CHAIN.id) {
          setStatus("switching");
          await switchChainAsync({ chainId: POOL_CHAIN.id });
        }

        setStatus("signing");

        // Always use pool chain for auth signature to ensure consistent account ID
        const message = getShinobiAuthMessage(walletAddress, POOL_CHAIN.id, {
          deterministic: true,
        });
        const signature = await signTypedDataAsync(message);

        setStatus("authenticating");

        await AuthController.signInWithWallet({
          chainId: POOL_CHAIN.id,
          signature,
          walletAddress,
        });
      } catch (e) {
        setStatus("idle");
        disconnect(); // Clear connection so user can start fresh

        // Don't show toast for user cancellations (rejected signature, closed wallet)
        if (!isUserCancellation(e)) {
          showToast.error(getUserMessage(e, "Sign in failed. Please try again."));
        }
      }
    },
    [chainId, switchChainAsync, signTypedDataAsync, disconnect]
  );

  // Continue sign-in flow after wallet connects via modal
  useEffect(() => {
    if (pendingSignIn.current && isConnected && address) {
      pendingSignIn.current = false;
      continueSignIn(address as `0x${string}`);
    }
  }, [isConnected, address, continueSignIn]);

  const start = async () => {
    if (status !== "idle") return;

    // If already connected, proceed directly to signing
    if (isConnected && address) {
      await continueSignIn(address as `0x${string}`);
      return;
    }

    // Open wallet modal for wallet selection
    setStatus("connecting");
    pendingSignIn.current = true;
    openWalletModal(() => {
      // Reset to idle when modal is closed without connecting
      if (pendingSignIn.current && !isConnected) {
        pendingSignIn.current = false;
        setStatus("idle");
        disconnect(); // Clear any cached connector state
      }
    });
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {status === "idle" ? (
        <button
          onClick={start}
          className="flex w-full max-w-sm cursor-pointer flex-col items-start rounded-lg border border-white/10 bg-white/[0.02] p-4 text-left hover:bg-white/[0.04]"
        >
          <div className="mb-2 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-white" />
            <span className="font-medium text-white">Sign in with Wallet</span>
          </div>
          <p className="text-xs text-neutral-400">Sign with your wallet to access your account.</p>
        </button>
      ) : (
        <div className="flex flex-col items-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-white" />
          <p className="text-sm text-neutral-400">
            {
              {
                connecting: "Connecting wallet…",
                switching: "Switching to Arbitrum…",
                signing: "Awaiting signature…",
                authenticating: "Signing in…",
              }[status]
            }
          </p>
          {status === "connecting" && (
            <button
              onClick={() => {
                pendingSignIn.current = false;
                setStatus("idle");
                disconnect(); // Clear any cached connector state
              }}
              className="mt-4 text-xs text-neutral-500 hover:text-neutral-300"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
