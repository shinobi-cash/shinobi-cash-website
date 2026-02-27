/**
 * AppRuntime - Single source of truth for app lifecycle
 * Centralized orchestrator for all bootstrap/shutdown logic
 */

import { AuthController } from "@/controllers/AuthController";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";
import { createClient, destroyClient } from "@/runtime/ClientSingleton";
import { accountService } from "@/services/AccountService";

let running = false;

const log = {
  debug: (...args: unknown[]) => console.debug("[AppRuntime]", ...args),
  error: (...args: unknown[]) => console.error("[AppRuntime]", ...args),
};

function _teardown() {
  NotesDiscoveryController.reset();
  destroyClient();
}

export const AppRuntime = {
  /**
   * Start the application runtime
   * Only bootstraps auth — account + notes are started reactively via onAuthenticated()
   */
  async start() {
    if (running) return;

    log.debug("Starting runtime...");

    try {
      await AuthController.bootstrap();
      running = true;
      log.debug("Runtime started");
    } catch (error) {
      log.error("Runtime start failed:", error);
      throw error;
    }
  },

  /**
   * Stop the application runtime
   */
  async stop() {
    if (!running) return;

    log.debug("Stopping runtime...");
    _teardown();
    running = false;
    log.debug("Runtime stopped");
  },

  /**
   * Called when auth transitions to authenticated
   * Creates SDK account from in-memory private key, bootstraps notes
   */
  async onAuthenticated() {
    if (!running) return;

    const privateKey = accountService.getMasterKey();
    if (!privateKey) {
      log.error("onAuthenticated: no private key in AccountService");
      return;
    }

    try {
      log.debug("Creating client...");
      createClient(privateKey);

      // Fire-and-forget — discovery handles its own errors
      NotesDiscoveryController.bootstrap();
    } catch (error) {
      log.error("onAuthenticated failed:", error);
      _teardown();
    }
  },

  /**
   * Cleanup on logout
   * Tears down account + notes but keeps runtime running for re-login
   */
  async onLogout() {
    if (!running) return;

    log.debug("Logout cleanup...");
    try {
      _teardown();
    } catch (error) {
      log.error("Logout cleanup failed:", error);
    }
  },
};
