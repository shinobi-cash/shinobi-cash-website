"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { useAccount, useChainId, useConnect, useSignTypedData } from "wagmi";
import { AuthController } from "@/controllers/AuthController";
import { getEIP712Message } from "@/utils/authCrypto";

type Status = "idle" | "connecting" | "signing" | "authenticating";

export function WalletAuth() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connectAsync } = useConnect();
  const { signTypedDataAsync } = useSignTypedData();
  const [status, setStatus] = useState<Status>("idle");

  const start = async () => {
    try {
      if (status !== "idle") return;

      let walletAddress = address as `0x${string}` | undefined;

      if (!isConnected || !walletAddress || !chainId) {
        setStatus("connecting");
        const connector = connectors[0];
        if (!connector) throw new Error("No wallet connector");

        const result = await connectAsync({ connector });
        walletAddress = result.accounts?.[0] as `0x${string}`;

        if (!walletAddress) throw new Error("Wallet address missing");
      }
      setStatus("signing");

      const message = getEIP712Message(walletAddress, chainId, { deterministic: true });
      console.log("Request Signing the auth message");
      const signature = await signTypedDataAsync(message);

      setStatus("authenticating");

      AuthController.signInWithWallet({
        chainId,
        signature,
        walletAddress,
      });
    } catch (e) {
      setStatus("idle");
      console.log("Error SigniIn With Wallet", e);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {status === "idle" ? (
        <button
          onClick={start}
          className="flex w-full max-w-sm flex-col items-start rounded-lg border border-gray-700 bg-gray-900/50 p-4 text-left hover:bg-gray-800"
        >
          <div className="mb-2 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-orange-500" />
            <span className="font-medium text-white">Sign in with Wallet</span>
          </div>
          <p className="text-xs text-gray-400">Sign with your wallet to access your account.</p>
        </button>
      ) : (
        <>
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-orange-500" />
          <p className="text-sm text-gray-400">
            {
              {
                connecting: "Connecting wallet…",
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
