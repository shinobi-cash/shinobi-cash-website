/**
 * Account Login Form
 * Login via passkey for existing accounts or wallet signature
 */
import { useAuth } from "@/contexts/AuthContext";
import { AuthError, AuthErrorCode } from "@/lib/errors/AuthError";
import { showToast } from "@/lib/toast";
import { Fingerprint, Wallet, WalletIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { Input } from "@workspace/ui/components/input";
import { performPasskeyLogin, performWalletLogin } from "./helpers/authFlows";
import { getEIP712Message } from "@/utils/eip712";
import { generateKeysFromRandomSeed, type KeyGenerationResult } from "@shinobi-cash/core";
import { modal } from "@/context";

interface AccountLoginFormProps {
  onSuccess: () => void;
  onCreateAccount?: () => void;
  onKeyGenerationComplete?: (data: {
    keys: KeyGenerationResult;
    encryptionKey: Uint8Array;
    walletAddress: string;
  }) => void;
  hasPasskeyAccounts: boolean;
  registerFooterActions?: (
    primary: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
      icon?: React.ReactNode;
    } | null,
    secondary?: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
      icon?: React.ReactNode;
    } | null
  ) => void;
}

type LoginMethod = "passkey" | "wallet" | null;

export function AccountLoginForm({
  onSuccess,
  onCreateAccount,
  onKeyGenerationComplete,
  hasPasskeyAccounts,
  registerFooterActions,
}: AccountLoginFormProps) {
  const { setKeys } = useAuth();
  const { address, chainId } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(null);
  const [accountName, setAccountName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setIsProcessing(true);
    setError(null);
    try {
      const result = await performPasskeyLogin(accountName);
      setKeys(result);
      showToast.auth.success("Passkey login");
      onSuccess();
    } catch (err) {
      console.error("Passkey login failed:", err);
      let msg = "Authentication failed. Please try again.";
      if (err instanceof AuthError) {
        switch (err.code) {
          case AuthErrorCode.PASSKEY_PRF_UNSUPPORTED:
            msg = "Your device doesn't support required passkey features.";
            break;
          case AuthErrorCode.PASSKEY_NOT_FOUND:
            msg = err.message;
            break;
          case AuthErrorCode.PASSKEY_CANCELLED:
            msg = "Authentication was cancelled. Please try again.";
            break;
          default:
            msg = err.message || msg;
        }
      }
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [accountName, onSuccess, setKeys]);

  const doWalletLogin = useCallback(async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Request wallet signature
      const typedData = getEIP712Message(address, chainId);
      const signature = await signTypedDataAsync(typedData);

      // Try to login with wallet
      const result = await performWalletLogin(signature, address);

      if (result === null) {
        // Account doesn't exist - generate keys and proceed to setup
        if (onKeyGenerationComplete) {
          // Split signature to generate keys and encryption key
          const signatureHex = signature.slice(2); // Remove '0x' prefix
          const keyGenSeed = signatureHex.slice(0, 64); // First 32 bytes
          const encryptionSeed = signatureHex.slice(64, 128); // Next 32 bytes

          const keys = generateKeysFromRandomSeed(keyGenSeed);
          const encryptionKey = new Uint8Array(
            encryptionSeed.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
          );

          // Navigate to setup step with generated keys
          onKeyGenerationComplete({
            keys,
            encryptionKey,
            walletAddress: address,
          });
        } else if (onCreateAccount) {
          // Fallback to old flow
          onCreateAccount();
        } else {
          setError("Account creation not available");
        }
      } else {
        // Account exists - complete login
        setKeys(result);
        showToast.auth.success("Wallet login");
        onSuccess();
      }
    } catch (err) {
      console.error("Wallet login failed:", err);
      const msg = err instanceof Error ? err.message : "Wallet authentication failed";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [
    address,
    chainId,
    signTypedDataAsync,
    onKeyGenerationComplete,
    onCreateAccount,
    onSuccess,
    setKeys,
  ]);

  // Register footer actions
  useEffect(() => {
    if (!registerFooterActions) return;

    // Initial choice screen
    if (loginMethod === null) {
      if (hasPasskeyAccounts) {
        // Show both options
        registerFooterActions(
          {
            label: "Sign in with Passkey",
            onClick: () => setLoginMethod("passkey"),
            icon: <Fingerprint className="h-5 w-5" />,
          },
          {
            label: "Sign in with Wallet",
            onClick: () => setLoginMethod("wallet"),
            variant: "ghost",
            icon: <Wallet className="h-5 w-5" />,
          }
        );
      } else {
        // Only wallet option for new users
        registerFooterActions(
          {
            label: "Sign in with Wallet",
            onClick: () => setLoginMethod("wallet"),
            icon: <Wallet className="h-5 w-5" />,
          },
          null
        );
      }
      return () => registerFooterActions(null);
    }

    // Passkey login flow
    if (loginMethod === "passkey") {
      const canSubmit = !isProcessing && !!accountName.trim();
      registerFooterActions(
        {
          label: "Sign in",
          onClick: doPasskeyLogin,
          disabled: !canSubmit,
          icon: <Fingerprint className="h-5 w-5" />,
        },
        {
          label: "Back",
          onClick: () => {
            setLoginMethod(null);
            setAccountName("");
            setError(null);
          },
          variant: "ghost",
        }
      );
      return () => registerFooterActions(null);
    }

    // Wallet login flow
    if (loginMethod === "wallet") {
      const isConnected = !!address;
      if (!isConnected) {
        // Show connect wallet button
        registerFooterActions(
          {
            label: "Connect Wallet",
            onClick: handleConnectWallet,
            icon: <WalletIcon className="h-5 w-5" />,
          },
          {
            label: "Back",
            onClick: () => setLoginMethod(null),
            variant: "ghost",
          }
        );
      } else {
        // Show sign message button
        registerFooterActions(
          {
            label: "Sign Message",
            onClick: doWalletLogin,
            disabled: isProcessing,
            icon: <Wallet className="h-5 w-5" />,
          },
          {
            label: "Back",
            onClick: () => setLoginMethod(null),
            variant: "ghost",
          }
        );
      }
      return () => registerFooterActions(null);
    }

    return () => registerFooterActions(null);
  }, [
    registerFooterActions,
    loginMethod,
    isProcessing,
    accountName,
    address,
    hasPasskeyAccounts,
    doPasskeyLogin,
    doWalletLogin,
    handleConnectWallet,
  ]);

  // Initial choice screen
  if (loginMethod === null) {
    return (
      <div className="space-y-4">
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
    );
  }

  // Passkey login screen
  if (loginMethod === "passkey") {
    return (
      <div className="space-y-2">
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
    );
  }

  // Wallet login screen
  if (loginMethod === "wallet") {
    if (!address) {
      // Wallet not connected
      return (
        <div className="space-y-4">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20">
              <WalletIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-app-primary mb-2 text-lg font-semibold">Connect Your Wallet</h3>
              <p className="text-app-secondary text-sm">
                Connect your wallet to sign a message and generate your account keys. This is free
                and won't send any transactions.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Wallet connected - ready to sign
    return (
      <div className="space-y-4">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-600/20">
            <WalletIcon className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <h3 className="text-app-primary mb-2 text-lg font-semibold">Sign Message</h3>
            <p className="text-app-secondary mb-4 text-sm">
              Sign a message with your wallet to access your account or create a new one. This will
              not trigger any blockchain transaction or cost gas.
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
    );
  }

  return null;
}
