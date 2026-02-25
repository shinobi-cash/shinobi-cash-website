"use client";

import { useEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { AppRuntime } from "@/runtime/AppRuntime";
import { AuthController } from "@/controllers/AuthController";

/**
 * Runtime Bootstrap Component
 * Single entry point for app lifecycle management
 */
export function RuntimeBootstrap() {
  const authState = useSnapshot(AuthController.state);
  const isAuthenticated = authState.state.status === "authenticated";
  const prevAuthenticated = useRef(isAuthenticated);

  // Start runtime on mount
  useEffect(() => {
    AppRuntime.start();

    return () => {
      AppRuntime.stop();
    };
  }, []);

  // React to auth state changes
  useEffect(() => {
    const wasAuthenticated = prevAuthenticated.current;
    prevAuthenticated.current = isAuthenticated;

    if (!wasAuthenticated && isAuthenticated) {
      AppRuntime.onAuthenticated();
    }

    if (wasAuthenticated && !isAuthenticated) {
      AppRuntime.onLogout();
    }
  }, [isAuthenticated]);

  return null;
}
