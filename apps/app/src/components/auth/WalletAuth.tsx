"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { useAccount, useChainId, useConnect, useSignTypedData, useSwitchChain } from "wagmi";
import { AuthController } from "@/controllers/AuthController";
import { getShinobiAuthMessage } from "@shinobi-cash/core";
import { showToast } from "@/lib/toast";
import { getUserMessage, isUserCancellation } from "@/lib/errors/errors";
import { POOL_CHAIN_ID } from "@/config/chains";

type Status = "idle" | "connecting" | "switching" | "signing" | "authenticating";

export function WalletAuth() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connectAsync } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();
  const [status, setStatus] = useState<Status>("idle");

  const start = async () => {
    try {
      if (status !== "idle") return;

      let walletAddress = address as `0x${string}` | undefined;

      if (!isConnected || !walletAddress) {
        setStatus("connecting");
        const connector = connectors[0];
        if (!connector) throw new Error("No wallet connector");

        const result = await connectAsync({ connector });
        walletAddress = result.accounts?.[0] as `0x${string}`;

        if (!walletAddress) throw new Error("Wallet address missing");
      }

      // Switch to pool chain if not already on it (required for EIP-712 signature)
      if (chainId !== POOL_CHAIN_ID) {
        setStatus("switching");
        await switchChainAsync({ chainId: POOL_CHAIN_ID });
      }

      setStatus("signing");

      // Always use pool chain for auth signature to ensure consistent account ID
      const message = getShinobiAuthMessage(walletAddress, POOL_CHAIN_ID, { deterministic: true });
      const signature = await signTypedDataAsync(message);

      setStatus("authenticating");

      AuthController.signInWithWallet({
        chainId: POOL_CHAIN_ID,
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
