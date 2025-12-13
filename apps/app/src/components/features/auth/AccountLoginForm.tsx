/**
 * Account Login Form
 * Single component for login via passkey (if supported) or password otherwise.
 */
import { useAuth } from "@/contexts/AuthContext";
import { AuthError, AuthErrorCode } from "@/lib/errors/AuthError";
import { showToast } from "@/lib/toast";
import { isPasskeySupported } from "@/utils/environment";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "../../ui/input";
import { PasswordField } from "../../ui/password-field";
import { performPasskeyLogin, performPasswordLogin } from "./helpers/authFlows";

interface AccountLoginFormProps {
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
}

export function AccountLoginForm({ onSuccess, registerFooterActions }: AccountLoginFormProps) {
  const { setKeys } = useAuth();
  const passkey = useMemo(() => isPasskeySupported(), []);

  const [accountName, setAccountName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // password-only state
  const [password, setPassword] = useState("");

  useEffect(() => {
    const id = passkey ? "username-login" : "username-password-login";
    const input = document.getElementById(id) as HTMLInputElement | null;
    input?.focus();
  }, [passkey]);

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
            msg = "Your device doesn’t support required passkey features. Use password instead.";
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

  const onPasswordSubmit: React.FormEventHandler = async (e) => {
    e.preventDefault();
    await doPasswordLogin();
  };

  const doPasswordLogin = useCallback(async () => {
    if (!password.trim() || !accountName.trim()) {
      setError("Please enter both account name and password");
      return;
    }
    if (!password.trim() || !accountName.trim()) {
      setError("Please enter both account name and password");
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const result = await performPasswordLogin(accountName, password);
      setKeys(result);
      showToast.auth.success("Login");
      onSuccess();
    } catch (err) {
      console.error("Password login failed:", err);
      const msg = err instanceof AuthError ? err.message : err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [accountName, password, onSuccess, setKeys]);

  // Register footer actions
  useEffect(() => {
    if (!registerFooterActions) return;
    const canSubmit = !isProcessing && !!accountName.trim() && (passkey ? true : !!password.trim());
    const onClick = passkey ? doPasskeyLogin : doPasswordLogin;
    registerFooterActions({ label: "Sign in", onClick, disabled: !canSubmit });
    return () => registerFooterActions(null);
  }, [registerFooterActions, passkey, isProcessing, accountName, password, doPasskeyLogin, doPasswordLogin]);

  if (passkey) {
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
          className="mt-3 mb-2"
          disabled={isProcessing}
        />
        {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onPasswordSubmit} className="space-y-2">
      <Input
        id="username-password-login"
        type="text"
        value={accountName}
        onChange={(e) => {
          setAccountName(e.target.value);
          if (error) setError(null);
        }}
        placeholder="Account Name"
        autoComplete="username"
        className="mt-3 mb-2"
        disabled={isProcessing}
      />
      <PasswordField
        id="login-password"
        value={password}
        onChange={(val) => {
          setPassword(val);
          if (error) setError(null);
        }}
        placeholder="Enter your password"
        required
        disabled={isProcessing}
        autoComplete="current-password"
        errorText={error ?? undefined}
      />
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </form>
  );
}
