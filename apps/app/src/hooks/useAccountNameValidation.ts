import { storageManager } from "@/lib/storage";
import { useEffect, useRef, useState } from "react";

async function validateAccountName(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return "Account name is required";
  if (trimmed.length < 2) return "Account name must be at least 2 characters";
  if (trimmed.length > 30) return "Account name must be less than 30 characters";
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed))
    return "Account name can only contain letters, numbers, spaces, hyphens, and underscores";

  const exists = await storageManager.accountExists(trimmed);
  if (exists) return "An account with this name already exists";

  return null;
}

/**
 * Debounced account name validation hook.
 * Usage:
 *  const { accountNameError, onAccountNameChange, resetError } = useAccountNameValidation();
 *  onChange={(e) => { setAccountName(e.target.value); onAccountNameChange(e.target.value); }}
 */
export function useAccountNameValidation(delay = 500) {
  const [accountNameError, setAccountNameError] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const onAccountNameChange = (nextValue: string) => {
    if (accountNameError) setAccountNameError("");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const trimmed = nextValue.trim();
    if (!trimmed) return;

    timeoutRef.current = setTimeout(async () => {
      try {
        const err = await validateAccountName(trimmed);
        setAccountNameError(err || "");
      } catch (e) {
        // non-fatal, skip validation error surfacing
      }
    }, delay);
  };

  const resetError = () => setAccountNameError("");

  return { accountNameError, onAccountNameChange, resetError, setAccountNameError };
}
