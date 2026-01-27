/**
 * AppRuntime - Single source of truth for app lifecycle
 * Centralized orchestrator for all bootstrap/shutdown logic
 */

import { AuthController } from "@/controllers/AuthController";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";

type RuntimeState = "stopped" | "starting" | "running" | "stopping";

interface AppRuntimeState {
  state: RuntimeState;
  startedAt: number | null;
}

const state: AppRuntimeState = {
  state: "stopped",
  startedAt: null,
};

const log = {
  debug: (...args: unknown[]) => console.debug("[AppRuntime]", ...args),
  error: (...args: unknown[]) => console.error("[AppRuntime]", ...args),
};

export const AppRuntime = {
  /**
   * Start the application runtime
   * Orchestrates all bootstrap operations in correct order
   */
  async start() {
    if (state.state === "running" || state.state === "starting") {
      log.debug("Runtime already started or starting");
      return;
    }

    state.state = "starting";
    log.debug("Starting runtime...");

    try {
      // Phase 1: Bootstrap Auth (must happen first)
      log.debug("Phase 1: Bootstrapping Auth...");
      await AuthController.bootstrap();

      // Phase 2: Bootstrap Notes (depends on crypto from Auth)
      // Only bootstrap if crypto is ready
      const crypto = AuthController.state.crypto;
      if (crypto.cryptoReady) {
        log.debug("Phase 2: Bootstrapping Notes...");
        await NotesDiscoveryController.bootstrap();

        // Phase 3: Start background workers
        log.debug("Phase 3: Starting background sync...");
        NotesDiscoveryController.startBackgroundSync(SHINOBI_CASH_ETH_POOL.address);
      }

      state.state = "running";
      state.startedAt = Date.now();
      log.debug("Runtime started successfully");
    } catch (error) {
      log.error("Runtime start failed:", error);
      state.state = "stopped";
      throw error;
    }
  },

  /**
   * Stop the application runtime
   * Cleanly shuts down all services
   */
  async stop() {
    if (state.state === "stopped" || state.state === "stopping") {
      log.debug("Runtime already stopped or stopping");
      return;
    }

    state.state = "stopping";
    log.debug("Stopping runtime...");

    try {
      // Phase 1: Stop background workers
      log.debug("Phase 1: Stopping background sync...");
      NotesDiscoveryController.stopBackgroundSync();

      // Phase 2: Reset controllers
      log.debug("Phase 2: Resetting controllers...");
      NotesDiscoveryController.reset();
      // Note: Don't logout Auth, just clear in-memory state if needed

      state.state = "stopped";
      state.startedAt = null;
      log.debug("Runtime stopped successfully");
    } catch (error) {
      log.error("Runtime stop failed:", error);
      state.state = "stopped";
      throw error;
    }
  },

  /**
   * Restart notes sync when crypto becomes ready
   * Called reactively when auth state changes
   */
  async onCryptoReady() {
    if (state.state !== "running") return;

    const crypto = AuthController.state.crypto;
    if (!crypto.cryptoReady) return;

    log.debug("Crypto ready, bootstrapping notes...");
    await NotesDiscoveryController.bootstrap();
    NotesDiscoveryController.startBackgroundSync(SHINOBI_CASH_ETH_POOL.address);
  },

  /**
   * Cleanup on logout
   * Called when user explicitly logs out
   * Stops background workers and resets notes state
   */
  async onLogout() {
    if (state.state !== "running") return;

    log.debug("Logout detected, cleaning up notes and workers...");

    try {
      // Stop background workers
      NotesDiscoveryController.stopBackgroundSync();

      // Reset notes state
      NotesDiscoveryController.reset();

      log.debug("Logout cleanup complete");
    } catch (error) {
      log.error("Logout cleanup failed:", error);
    }
  },

  /**
   * Get runtime state (for debugging/monitoring)
   */
  getState: () => state,
};
