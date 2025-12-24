/**
 * file: shinobi-cash-website/apps/app/src/components/SessionRestoreManager.tsx
 * Session Restore Manager
 * Bridges session restoration with authentication
 *
 * This component:
 * - Runs session restoration on app load
 * - Calls auth.authenticate() when session is restored
 * - Manages quick auth UI if needed
 *
 * Should be placed inside AuthProvider in the component tree.
 */

"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useSessionRestore } from "@/features/auth/hooks/useSessionRestore";
import type { ReactNode } from "react";

interface SessionRestoreManagerProps {
  children: ReactNode;
}

export function SessionRestoreManager({ children }: SessionRestoreManagerProps) {
  const auth = useAuth();

  // Auto-restore session and authenticate when restored
  useSessionRestore(auth.authenticate);

  // Just render children - session restoration happens in background
  return <>{children}</>;
}
