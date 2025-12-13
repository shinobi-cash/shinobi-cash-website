import { type KeyGenerationResult, generateKeysFromRandomSeed } from "@shinobi-cash/core";
import { AlertCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface KeyGenerationSectionProps {
  onKeyGenerationComplete: (keys: KeyGenerationResult) => void;
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

export function KeyGenerationSection({ onKeyGenerationComplete, registerFooterActions }: KeyGenerationSectionProps) {
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");

  const handleGenerateKeys = useCallback(async () => {
    setProgress(0);
    setIsGenerating(true);
    setGenerationError(""); // Clear any previous error
    try {
      // Simulate progress for better UX
      const tasks = [
        { name: "Generating entropy...", duration: 600 },
        { name: "Creating mnemonic...", duration: 700 },
        { name: "Deriving keys...", duration: 500 },
        { name: "Validating security...", duration: 400 },
      ];

      let completedProgress = 0;
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        setCurrentTask(task.name);
        const taskProgress = 100 / tasks.length;
        const startProgress = completedProgress;

        // Animate progress within this task
        const steps = 10;
        for (let step = 0; step <= steps; step++) {
          const stepProgress = (step / steps) * taskProgress;
          setProgress(startProgress + stepProgress);
          await new Promise((resolve) => setTimeout(resolve, task.duration / steps));
        }

        completedProgress += taskProgress;
      }

      setCurrentTask("Finalizing...");

      // Generate secure random seed
      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      const randomSeed = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const keys = generateKeysFromRandomSeed(randomSeed);
      setProgress(100);

      setTimeout(() => {
        setIsGenerating(false);
        onKeyGenerationComplete(keys);
      }, 500);
    } catch (error) {
      console.error("Key generation failed:", error);
      setIsGenerating(false);
      setGenerationError("Key generation failed. Please try again.");
    }
  }, [onKeyGenerationComplete]);

  useEffect(() => {
    if (!registerFooterActions) return;
    const disabled = isGenerating;
    const label = generationError ? "Try Again" : isGenerating ? "Generating..." : "Generate Keys";
    registerFooterActions({ label, onClick: handleGenerateKeys, disabled });
    return () => registerFooterActions(null);
  }, [registerFooterActions, isGenerating, generationError, handleGenerateKeys]);

  if (isGenerating) {
    return (
      <div className="space-y-2">
        <div className="bg-app-surface rounded-xl p-2 border border-app shadow-sm">
          <div className="text-center">
            <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
              <div className="h-2 bg-violet-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm font-medium text-app-primary text-center mb-2">
              {currentTask || "Preparing key generation..."}
            </p>
            <p className="text-xs text-app-secondary">Please wait while we generate your secure keys...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-2">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">What happens next?</p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Generate cryptographically secure keys</li>
              <li>• Your identity keys let Shinobi discover your on‑chain notes</li>
              <li>• A session key encrypts notes locally; your 12‑word phrase restores this on a new device</li>
              <li>• Set up convenient authentication</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Generation Status Messages */}
      {generationError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{generationError}</p>
        </div>
      )}

      {/* Action moved to footer */}
    </div>
  );
}
