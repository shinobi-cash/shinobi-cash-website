/**
 * Quick Auth Drawer - For Session Restoration
 * Shows when user needs to re-enter password for their account after page refresh
 */

import { useAuth } from "@/contexts/AuthContext";
import { showToast } from "@/lib/toast";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { ResponsiveModal } from "../../ui/responsive-modal";

export function PasswordAuthDrawer() {
  const { quickAuthState, handleQuickPasswordAuth, dismissQuickAuth } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  // Auto-focus on password input when drawer opens
  useEffect(() => {
    if (quickAuthState?.show) {
      const input = document.getElementById("quick-auth-password") as HTMLInputElement | null;
      if (input) {
        input.focus();
      }
    }
  }, [quickAuthState?.show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      await handleQuickPasswordAuth(password);
      showToast.auth.success("Session restored");
    } catch (error) {
      console.error("Quick auth failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    dismissQuickAuth();
    setPassword("");
    setError(null);
  };

  return (
    <ResponsiveModal
      open={quickAuthState?.show ?? false}
      onOpenChange={(open) => !open && handleDismiss()}
      title="Welcome Back"
      description={`Detected an old session for '${quickAuthState?.accountName}'`}
      className="bg-app-background border-app"
      showFooter
      footerContent={
        <div className="grid grid-cols-2 gap-3 w-full">
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isProcessing}
            className="col-span-1 w-full min-h-12 py-3 text-base font-medium rounded-2xl"
            size="lg"
          >
            <span className="w-full text-center leading-tight">Use different account</span>
          </Button>
          <Button
            variant="default"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={isProcessing || !password.trim()}
            className="col-span-1 w-full min-h-12 py-3 text-base font-medium rounded-2xl justify-center gap-2"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-center leading-tight">Signing in…</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                <span className="text-center leading-tight">Sign in</span>
              </>
            )}
          </Button>
        </div>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <Input
            id="quick-auth-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Enter your password"
            className="pr-10"
            disabled={isProcessing}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            disabled={isProcessing}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-app-tertiary" />
            ) : (
              <Eye className="h-4 w-4 text-app-tertiary" />
            )}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>
    </ResponsiveModal>
  );
}
