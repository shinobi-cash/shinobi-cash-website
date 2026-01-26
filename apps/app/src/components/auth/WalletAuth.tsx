"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Wallet } from "lucide-react";
import { useAppKit, useAppKitAccount, useAppKitEvents, useAppKitNetwork } from "@reown/appkit/react";
import { useSignTypedData } from "wagmi";
import { AuthController } from "@/controllers/AuthController";
import { getShinobiAuthMessage } from "@shinobi-cash/core";
import { showToast } from "@/lib/toast";
import { getUserMessage, isUserCancellation } from "@/lib/errors/errors";
import { POOL_CHAIN } from "@shinobi-cash/constants";

type Status = "idle" | "connecting" | "switching" | "signing" | "authenticating";

export function WalletAuth() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const events = useAppKitEvents();
  const { chainId, switchNetwork } = useAppKitNetwork();
  const { signTypedDataAsync } = useSignTypedData();
  const [status, setStatus] = useState<Status>("idle");
  const pendingSignIn = useRef(false);

  const continueSignIn = useCallback(async (walletAddress: `0x${string}`) => {
    try {
      // Switch to pool chain if not already on it (required for EIP-712 signature)
      if (chainId !== POOL_CHAIN.id) {
        setStatus("switching");
        await switchNetwork(POOL_CHAIN);
      }

      setStatus("signing");

      // Always use pool chain for auth signature to ensure consistent account ID
      const message = getShinobiAuthMessage(walletAddress, POOL_CHAIN.id, { deterministic: true });
      const signature = await signTypedDataAsync(message);

      setStatus("authenticating");

      AuthController.signInWithWallet({
        chainId: POOL_CHAIN.id,
        signature,
        walletAddress,
      });
    } catch (e) {
      setStatus("idle");

      // Don't show toast for user cancellations (rejected signature, closed wallet)
      if (!isUserCancellation(e)) {
        showToast.error(getUserMessage(e, "Sign in failed. Please try again."));
      }
    }
  }, [chainId, switchNetwork, signTypedDataAsync]);

  // Detect when user closes modal without connecting
  useEffect(() => {
    if (events.data.event === "MODAL_CLOSE" && pendingSignIn.current && !isConnected) {
      pendingSignIn.current = false;
      setStatus("idle");
    }
  }, [events, isConnected]);

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

    // Open Reown modal for wallet selection
    setStatus("connecting");
    pendingSignIn.current = true;
    open();
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {status === "idle" ? (
        <button
          onClick={start}
          className="border-white/10 bg-white/[0.02] hover:bg-white/[0.04] flex w-full max-w-sm flex-col items-start rounded-lg border p-4 text-left"
        >
          <div className="mb-2 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-white" />
            <span className="text-white font-medium">Sign in with Wallet</span>
          </div>
          <p className="text-neutral-400 text-xs">
            Sign with your wallet to access your account.
          </p>
        </button>
      ) : (
        <>
          <div className="border-white/10 mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-white" />
          <p className="text-neutral-400 text-sm">
            {
              {
                connecting: "Connecting wallet…",
                switching: "Switching to Arbitrum…",
                signing: "Awaiting signature…",
                authenticating: "Signing in…",
              }[status]
            }
          </p>
        </>
      )}
    </div>
  );
}
