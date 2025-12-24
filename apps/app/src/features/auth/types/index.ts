/**
 * Auth Types - Public Exports
 * @file features/auth/types/index.ts
 */

// Status types
export type { AuthStep, AuthStatus } from "./authStatus";
export { AUTH_STATUS_LABELS, AUTH_STEP_LABELS } from "./authStatus";

// Error types
export type { AuthError } from "./authErrors";
export {
  createPasskeyError,
  createWalletError,
  createValidationError,
  createAccountError,
  createSessionError,
  createNetworkError,
  normalizeAuthError,
} from "./authErrors";

// Method types
export type { AuthMethod, LoginMethod } from "./authMethod";
export { AUTH_METHOD_LABELS } from "./authMethod";
