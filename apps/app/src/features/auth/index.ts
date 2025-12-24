/**
 * Auth Feature - Public API
 * This is the ONLY file that external code should import from
 *
 * Usage:
 * import { AccountLoginForm, useAuthFlowController, usePasskeyAuth } from '@/features/auth';
 * @file features/auth/index.ts
 */

// Components (UI)
export { AccountLoginForm } from "./components/AccountLoginForm";
export { default as AccountSetupForm } from "./components/AccountSetupForm";
export { AccountMenu } from "./components/AccountMenu";
export { AddPasskeyModal } from "./components/AddPasskeyModal";
export { AuthStepContent } from "./components/AuthStepContent";
export { SyncingNotesSection } from "./components/SyncingNotesSection";
export { WalletSignatureKeyGeneration } from "./components/WalletSignatureKeyGeneration";

// Controller (Feature Orchestrator)
export { useAuthFlowController } from "./controller/useAuthFlowController";
export type { AuthFlowController } from "./controller/useAuthFlowController";
export { useAuthController } from "./controller/useAuthController";

// Hooks (Focused operations)
export { usePasskeyAuth, useWalletAuth, useSessionRestore, useAddPasskeyFlow } from "./hooks";

// Types (Public types only)
export type { AuthStep, AuthStatus, AuthError, AuthMethod, LoginMethod } from "./types";
export {
  AUTH_STATUS_LABELS,
  AUTH_STEP_LABELS,
  AUTH_METHOD_LABELS,
  createPasskeyError,
  createWalletError,
  createValidationError,
  createAccountError,
  createSessionError,
  createNetworkError,
} from "./types";

// Protocol (Rarely needed outside feature, but exported for advanced use cases)
export {
  performPasskeyLogin,
  performPasskeySetup,
  performWalletLogin,
  setupWalletAccount,
  generateKeysFromWalletSignature,
  checkSessionResume,
  clearSession,
  listAccounts,
  hasAccounts,
} from "./protocol";
export type { SessionResumeResult } from "./protocol";
