/**
 * Account Setup Form
 * Complete account creation form with both passkey and password options
 * Handles account validation, authentication setup, and encrypted key storage
 */

import { useAuth } from "@/contexts/AuthContext";
import { useAccountNameValidation } from "@/hooks/useAccountNameValidation";
import { AuthError, AuthErrorCode } from "@/lib/errors/AuthError";
import { storageManager } from "@/lib/storage";
import { showToast } from "@/lib/toast";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { isPasskeySupported } from "@/utils/environment";
import { AlertCircle } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Input } from "../../ui/input";
import { PasswordField } from "../../ui/password-field";
import { performPasskeySetup, performPasswordSetup } from "./helpers/authFlows";

interface AccountSetupFormProps {
  generatedKeys: KeyGenerationResult | null;
  onAccountSetupComplete: () => void;
  registerFooterActions?: (
    primary: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
    } | null,
    secondary?: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
    } | null,
  ) => void;
}

export default function AccountSetupForm({
  generatedKeys,
  onAccountSetupComplete,
  registerFooterActions,
}: AccountSetupFormProps) {
  const shouldShowPasskey = isPasskeySupported();

  if (shouldShowPasskey) {
    return (
      <PasskeySetupForm
        generatedKeys={generatedKeys}
        onSuccess={onAccountSetupComplete}
        registerFooterActions={registerFooterActions}
      />
    );
  }

  return (
    <PasswordSetupForm
      generatedKeys={generatedKeys}
      onSuccess={onAccountSetupComplete}
      registerFooterActions={registerFooterActions}
    />
  );
}

// Passkey Setup Form Component
function PasskeySetupForm({
  generatedKeys,
  onSuccess,
  registerFooterActions,
}: {
  generatedKeys: KeyGenerationResult | null;
  onSuccess: () => void;
  registerFooterActions?: (
    primary: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
    } | null,
    secondary?: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
    } | null,
  ) => void;
}) {
  const [accountName, setAccountName] = useState("");
  const { accountNameError, onAccountNameChange, setAccountNameError } = useAccountNameValidation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [setupError, setSetupError] = useState("");
  const { setKeys } = useAuth();
  const formRef = useRef<HTMLFormElement | null>(null);

  // Auto-focus on account name input when component mounts
  useEffect(() => {
    const input = document.getElementById("account-name") as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }, []);

  const handlePasskeySetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (accountNameError || !accountName.trim() || !generatedKeys) {
      return;
    }

    setIsProcessing(true);

    try {
      await performPasskeySetup(accountName, generatedKeys);

      // Set keys in auth context for immediate use
      setKeys(generatedKeys);

      // Optionally initialize sync baseline for new account
      if (generatedKeys.publicKey) {
        try {
          await storageManager.initializeSyncBaseline(generatedKeys.publicKey);
        } catch (error) {
          console.warn("Failed to initialize sync baseline:", error);
          // Non-fatal
        }
      }

      showToast.auth.success("Account created");
      onSuccess();
    } catch (error) {
      console.error("Passkey setup failed:", error);
      if (error instanceof AuthError) {
        if (error.code === AuthErrorCode.PASSKEY_PRF_UNSUPPORTED) {
          setSetupError("Device not supported - passkeys with PRF extension required");
        } else if (error.code === AuthErrorCode.ACCOUNT_ALREADY_EXISTS) {
          setSetupError("Passkey already exists for this account");
        } else if (error.code === AuthErrorCode.PASSKEY_CANCELLED) {
          setSetupError("Setup was cancelled. Please try again.");
        } else {
          setSetupError(error.message || "Passkey setup failed. Please try again.");
        }
      } else {
        setSetupError("Passkey setup failed. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!registerFooterActions) return;
    const disabled = isProcessing || !!accountNameError || !accountName.trim() || !generatedKeys;
    registerFooterActions({
      label: "Continue",
      onClick: () => {
        // Submit the form to reuse onSubmit validation/flow
        formRef.current?.requestSubmit();
      },
      disabled,
    });
    return () => registerFooterActions(null);
  }, [registerFooterActions, isProcessing, accountNameError, accountName, generatedKeys]);

  return (
    <form ref={formRef} onSubmit={handlePasskeySetup} className="space-y-2">
      <Input
        id="account-name"
        type="text"
        value={accountName}
        onChange={(e) => {
          setAccountName(e.target.value);
          if (accountNameError) setAccountNameError("");
          if (setupError) setSetupError("");

          // Debounce the validation to avoid excessive database calls
          onAccountNameChange(e.target.value);
        }}
        placeholder="Account Name"
        maxLength={30}
        autoComplete="off"
        aria-invalid={!!accountNameError}
      />
      {accountNameError && <p className="text-red-600 text-xs">{accountNameError}</p>}

      {/* Setup Status Messages */}
      {setupError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{setupError}</p>
        </div>
      )}

      {/* Actions moved to footer */}
    </form>
  );
}

// Password Setup Form Component
function PasswordSetupForm({
  generatedKeys,
  onSuccess,
  registerFooterActions,
}: {
  generatedKeys: KeyGenerationResult | null;
  onSuccess: () => void;
  registerFooterActions?: (
    primary: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
    } | null,
    secondary?: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
    } | null,
  ) => void;
}) {
  const [accountName, setAccountName] = useState("");
  const { accountNameError, onAccountNameChange, setAccountNameError } = useAccountNameValidation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [setupError, setSetupError] = useState("");
  const { setKeys } = useAuth();
  const formRef = useRef<HTMLFormElement | null>(null);

  // Auto-focus on account name input when component mounts
  useEffect(() => {
    const input = document.getElementById("account-name") as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }, []);

  const validatePassword = (pass: string) => {
    if (pass.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])/.test(pass)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/(?=.*[A-Z])/.test(pass)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/(?=.*\d)/.test(pass)) {
      return "Password must contain at least one number";
    }
    return "";
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (accountNameError || !accountName.trim() || !generatedKeys) {
      return;
    }

    const passError = validatePassword(password);
    if (passError) {
      setPasswordError(passError);
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      // Check for existing account (this also initializes the database)
      const existingAccount = await storageManager.getAccountDataByName(accountName.trim());
      if (existingAccount) {
        setSetupError("Account already exists");
        return;
      }
    } catch (error) {
      console.error("Failed to check existing account:", error);
      setSetupError("Database error");
      return;
    }

    setIsProcessing(true);

    try {
      await performPasswordSetup(accountName, generatedKeys, password);

      // Set keys in auth context
      setKeys(generatedKeys);

      // Initialize sync baseline for new account to avoid scanning historical blockchain data
      if (generatedKeys.publicKey) {
        try {
          await storageManager.initializeSyncBaseline(generatedKeys.publicKey);
        } catch (error) {
          console.warn("Failed to initialize sync baseline:", error);
          // Don't block account creation if this fails
        }
      }

      showToast.auth.success("Account created");
      onSuccess();
    } catch (error) {
      console.error("Password setup failed:", error);
      setSetupError("Setup failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!registerFooterActions) return;
    const disabled =
      isProcessing || !!accountNameError || !accountName.trim() || !generatedKeys || !password || !confirmPassword;
    registerFooterActions({
      label: "Continue",
      onClick: () => {
        // Submit the form to reuse onSubmit validation/flow
        formRef.current?.requestSubmit();
      },
      disabled,
    });
    return () => registerFooterActions(null);
  }, [registerFooterActions, isProcessing, accountNameError, accountName, generatedKeys, password, confirmPassword]);

  return (
    <form ref={formRef} onSubmit={handlePasswordSetup} className="space-y-3">
      <div>
        <Input
          id="account-name"
          type="text"
          value={accountName}
          onChange={(e) => {
            setAccountName(e.target.value);
            if (accountNameError) setAccountNameError("");
            if (setupError) setSetupError("");

            // Debounce the validation to avoid excessive database calls
            onAccountNameChange(e.target.value);
          }}
          placeholder="Account Name"
          maxLength={30}
          autoComplete="off"
          aria-invalid={!!accountNameError}
        />
        {accountNameError && <p className="text-red-600 text-xs mt-1">{accountNameError}</p>}
      </div>

      <PasswordField
        id="setup-password"
        value={password}
        onChange={(val) => {
          setPassword(val);
          if (passwordError) setPasswordError("");
          if (setupError) setSetupError("");
        }}
        placeholder="Enter password"
        required
        disabled={isProcessing}
        errorText={passwordError}
      />

      <PasswordField
        id="confirm-password"
        value={confirmPassword}
        onChange={(val) => {
          setConfirmPassword(val);
          if (passwordError) setPasswordError("");
        }}
        placeholder="Confirm your password"
        required
        disabled={isProcessing}
      />

      {passwordError && <p className="text-red-600 text-xs">{passwordError}</p>}

      {/* Setup Status Messages */}
      {setupError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{setupError}</p>
        </div>
      )}

      <div className="text-xs text-app-tertiary space-y-1">
        <p>Password requirements:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>At least 8 characters</li>
          <li>One uppercase and lowercase letter</li>
          <li>One number</li>
        </ul>
      </div>

      {/* Actions moved to footer */}
    </form>
  );
}
