import { type KeyGenerationResult, restoreFromMnemonic, validateMnemonic } from "@shinobi-cash/core";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface LoginWithBackupPhraseProps {
  onRecoverAccountKey: (key: KeyGenerationResult) => void;
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

export function LoginWithBackupPhrase({ onRecoverAccountKey, registerFooterActions }: LoginWithBackupPhraseProps) {
  const [words, setWords] = useState<string[]>(Array(12).fill(""));
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  const handlePaste = (e: React.ClipboardEvent, idx: number) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text/plain");
    const pastedWords = pastedText.trim().split(/\s+/);

    if (pastedWords.length === 12) {
      setWords(pastedWords);
    } else if (pastedWords.length === 1) {
      const updated = [...words];
      updated[idx] = pastedWords[0].trim();
      setWords(updated);
    }
  };

  const handleChange = (idx: number, value: string) => {
    const updated = [...words];
    updated[idx] = value.trim();
    setWords(updated);
  };

  const performRecover = useCallback(async () => {
    if (!words.every((w) => w.trim())) {
      setError("Please enter all 12 words of your Login with Backup Phrase.");
      return;
    }

    if (!validateMnemonic(words)) {
      setError("Invalid Backup phrase. Please check your words and try again.");
      return;
    }

    setIsProcessing(true);

    try {
      const restoredKey = restoreFromMnemonic(words);
      onRecoverAccountKey(restoredKey);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to recover account. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [words, onRecoverAccountKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performRecover();
  };

  useEffect(() => {
    if (!registerFooterActions) return;
    const canSubmit = !isProcessing && words.every((w) => w.trim());
    registerFooterActions({ label: "Recover account", onClick: () => void performRecover(), disabled: !canSubmit });
    return () => registerFooterActions(null);
  }, [registerFooterActions, words, isProcessing, performRecover]);

  return (
    <div className="space-y-2">
      <div className="bg-app-surface rounded-xl p-2 border border-app shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {words.map((word, idx) => (
              <div key={`word-field-${idx}-${word}`} className="flex flex-col">
                <label htmlFor={`word-${idx}`} className="text-xs font-medium text-app-secondary text-center mb-1">
                  {idx + 1}
                </label>
                <input
                  id={`word-${idx}`}
                  ref={idx === 0 ? firstInputRef : undefined}
                  type="text"
                  className="p-2 rounded-lg border border-app text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-app-background"
                  placeholder="word"
                  value={word}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onPaste={(e) => handlePaste(e, idx)}
                  disabled={isProcessing}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>

          {/* Actions moved to footer */}

          {error && (
            <div className="p-2 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
