/**
 * Account Login Form
 * Login via passkey for existing accounts or wallet signature
 * @file features/auth/components/AccountLoginForm.tsx
 */
import { Fingerprint, Wallet, WalletIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { Input } from "@workspace/ui/components/input";
import { usePasskeyAuth, useWalletAuth } from "@/features/auth";
import { accountExists, getWalletAccountId } from "@/features/auth/protocol";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { modal } from "@/context";
import { Button } from "@workspace/ui/components/button";

interface AccountLoginFormProps {
  // Event emissions - controller handles all auth state mutations
  onPasskeyLoginSuccess: (keys: KeyGenerationResult) => void;
  onWalletLoginSuccess: (keys: KeyGenerationResult) => void;
  onNewWalletKeysGenerated: (data: {
    keys: KeyGenerationResult;
    encryptionKey: Uint8Array;
    walletAddress: string;
  }) => void;

  // Legacy support (deprecated)
  onCreateAccount?: () => void;

  hasPasskeyAccounts: boolean;
}

type LoginMethod = "passkey" | "wallet" | null;

export function AccountLoginForm({
  onPasskeyLoginSuccess,
  onWalletLoginSuccess,
  onNewWalletKeysGenerated,
  onCreateAccount,
  hasPasskeyAccounts,
}: AccountLoginFormProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const passkeyAuth = usePasskeyAuth();
  const walletAuth = useWalletAuth();

  // Destructure stable functions from hooks
  const { login: passkeyLogin, error: passkeyError } = passkeyAuth;
  const { login: walletLogin, generateKeys, error: walletError } = walletAuth;

  const [loginMethod, setLoginMethod] = useState<LoginMethod>(null);
  const [accountName, setAccountName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Derive processing state from hooks
  const isProcessing = passkeyAuth.isProcessing || walletAuth.isProcessing;

  useEffect(() => {
    if (loginMethod === "passkey") {
      const input = document.getElementById("username-login") as HTMLInputElement | null;
      input?.focus();
    }
  }, [loginMethod]);

  const handleConnectWallet = useCallback(() => {
    modal.open();
  }, []);

  const doPasskeyLogin = useCallback(async () => {
    if (!accountName.trim()) {
      setError("Please enter an account name");
      return;
    }
    setError(null);

    const result = await passkeyLogin(accountName);
    if (result) {
      // Emit event - controller handles authentication
      onPasskeyLoginSuccess(result);
    } else if (passkeyError) {
      setError(passkeyError.message);
    }
  }, [accountName, onPasskeyLoginSuccess, passkeyLogin, passkeyError]);

  const doWalletLogin = useCallback(async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    setError(null);

    // OPTIMIZATION: Check if account exists BEFORE prompting for signature
    // This prevents double-signing: login attempt + key generation
    const accountId = getWalletAccountId(address, chainId);
    const exists = await accountExists(accountId);

    if (exists) {
      // Account exists - login with wallet signature
      const result = await walletLogin();
      if (result) {
        // Emit event - controller handles authentication
        onWalletLoginSuccess(result);
      } else if (walletError) {
        setError(walletError.message);
      }
    } else {
      // Account doesn't exist - generate keys and proceed to setup (single signature)
      const keyData = await generateKeys();
      if (keyData) {
        // Emit event - controller handles setup flow
        onNewWalletKeysGenerated(keyData);
      } else if (walletError) {
        setError(walletError.message);
      }
    }
  }, [
    address,
    chainId,
    walletLogin,
    generateKeys,
    walletError,
    onNewWalletKeysGenerated,
    onWalletLoginSuccess,
  ]);

  // Initial choice screen
  if (loginMethod === null) {
    return (
      <>
        <div className="flex-1 space-y-4 px-4 py-6">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20">
              <Fingerprint className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-app-primary mb-2 text-lg font-semibold">Choose Sign-In Method</h3>
              <p className="text-app-secondary text-sm">
                {hasPasskeyAccounts
                  ? "Sign in using your saved passkey or wallet signature"
                  : "Sign in with your wallet to access or create your account"}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 px-4 py-4">
          <div className="grid w-full grid-cols-2 gap-3">
            {hasPasskeyAccounts && (
              <Button
                variant="ghost"
                onClick={() => setLoginMethod("wallet")}
                className="col-span-1 min-h-12 w-full rounded-2xl py-3 text-base font-medium"
                size="lg"
              >
                <span className="flex w-full items-center justify-center gap-2 text-center leading-tight">
                  <Wallet className="h-5 w-5" />
                  Sign in with Wallet
                </span>
              </Button>
            )}
            <Button
              variant="default"
              onClick={() => setLoginMethod(hasPasskeyAccounts ? "passkey" : "wallet")}
              className={`${hasPasskeyAccounts ? "col-span-1" : "col-span-2"} min-h-12 w-full rounded-2xl py-3 text-base font-medium`}
              size="lg"
            >
              <span className="flex w-full items-center justify-center gap-2 text-center leading-tight">
                {hasPasskeyAccounts ? (
                  <Fingerprint className="h-5 w-5" />
                ) : (
                  <Wallet className="h-5 w-5" />
                )}
                {hasPasskeyAccounts ? "Sign in with Passkey" : "Sign in with Wallet"}
              </span>
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Passkey login screen
  if (loginMethod === "passkey") {
    const canSubmit = !isProcessing && !!accountName.trim();

    return (
      <>
        <div className="flex-1 space-y-2 px-4 py-6">
          <Input
            id="username-login"
            type="text"
            value={accountName}
            onChange={(e) => {
              setAccountName(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && accountName.trim() && !isProcessing) {
                void doPasskeyLogin();
              }
            }}
            placeholder="Account Name"
            autoComplete="username webauthn"
            className="mb-2 mt-3"
            disabled={isProcessing}
          />
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        </div>

        <div className="border-t border-gray-800 px-4 py-4">
          <div className="grid w-full grid-cols-2 gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setLoginMethod(null);
                setAccountName("");
                setError(null);
              }}
              className="col-span-1 min-h-12 w-full rounded-2xl py-3 text-base font-medium"
              size="lg"
            >
              Back
            </Button>
            <Button
              variant="default"
              onClick={doPasskeyLogin}
              disabled={!canSubmit}
              className="col-span-1 min-h-12 w-full rounded-2xl py-3 text-base font-medium"
              size="lg"
            >
              <span className="flex w-full items-center justify-center gap-2 text-center leading-tight">
                <Fingerprint className="h-5 w-5" />
                Sign in
              </span>
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Wallet login screen
  if (loginMethod === "wallet") {
    if (!address) {
      // Wallet not connected
      return (
        <>
          <div className="flex-1 space-y-4 px-4 py-6">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20">
                <WalletIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-app-primary mb-2 text-lg font-semibold">Connect Your Wallet</h3>
                <p className="text-app-secondary text-sm">
                  Connect your wallet to sign a message and generate your account keys. This is free
                  and won&apos;t send any transactions.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 px-4 py-4">
            <div className="grid w-full grid-cols-2 gap-3">
              <Button
                variant="ghost"
                onClick={() => setLoginMethod(null)}
                className="col-span-1 min-h-12 w-full rounded-2xl py-3 text-base font-medium"
                size="lg"
              >
                Back
              </Button>
              <Button
                variant="default"
                onClick={handleConnectWallet}
                className="col-span-1 min-h-12 w-full rounded-2xl py-3 text-base font-medium"
                size="lg"
              >
                <span className="flex w-full items-center justify-center gap-2 text-center leading-tight">
                  <WalletIcon className="h-5 w-5" />
                  Connect Wallet
                </span>
              </Button>
            </div>
          </div>
        </>
      );
    }

    // Wallet connected - ready to sign
    return (
      <>
        <div className="flex-1 space-y-4 px-4 py-6">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-600/20">
              <WalletIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <h3 className="text-app-primary mb-2 text-lg font-semibold">Sign Message</h3>
              <p className="text-app-secondary mb-4 text-sm">
                Sign a message with your wallet to access your account or create a new one. This
                will not trigger any blockchain transaction or cost gas.
              </p>
              <div className="bg-app-card rounded-lg px-3 py-2">
                <p className="text-app-tertiary mb-1 text-xs">Connected Wallet</p>
                <p className="text-app-primary truncate font-mono text-sm">{address}</p>
              </div>
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 px-4 py-4">
          <div className="grid w-full grid-cols-2 gap-3">
            <Button
              variant="ghost"
              onClick={() => setLoginMethod(null)}
              className="col-span-1 min-h-12 w-full rounded-2xl py-3 text-base font-medium"
              size="lg"
            >
              Back
            </Button>
            <Button
              variant="default"
              onClick={doWalletLogin}
              disabled={isProcessing}
              className="col-span-1 min-h-12 w-full rounded-2xl py-3 text-base font-medium"
              size="lg"
            >
              <span className="flex w-full items-center justify-center gap-2 text-center leading-tight">
                <Wallet className="h-5 w-5" />
                Sign Message
              </span>
            </Button>
          </div>
        </div>
      </>
    );
  }

  return null;
}
