export enum AuthErrorCode {
  PASSKEY_NOT_FOUND = "PASSKEY_NOT_FOUND",
  PASSKEY_PRF_UNSUPPORTED = "PASSKEY_PRF_UNSUPPORTED",
  PASSKEY_CANCELLED = "PASSKEY_CANCELLED",
  PASSKEY_FAILED = "PASSKEY_FAILED",
  ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  ACCOUNT_ALREADY_EXISTS = "ACCOUNT_ALREADY_EXISTS",
  DB_ERROR = "DB_ERROR",
  UNKNOWN = "UNKNOWN",
}

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    if (options?.cause) {
      // @ts-ignore
      this.cause = options.cause;
    }
  }
}

export function isUserCancelledError(err: unknown): boolean {
  if (!err) return false;
  const maybeObj =
    typeof err === "object" && err !== null ? (err as Record<string, unknown>) : undefined;
  const msg = String((maybeObj?.message as string | undefined) ?? err);
  const name = String((maybeObj?.name as string | undefined) ?? "");
  return (
    name === "AbortError" ||
    name === "NotAllowedError" ||
    /canceled|cancelled|not allowed|aborted|denied/i.test(msg)
  );
}

export function mapPasskeyError(err: unknown): AuthError {
  const maybeObj =
    typeof err === "object" && err !== null ? (err as Record<string, unknown>) : undefined;
  const msg = String((maybeObj?.message as string | undefined) ?? err);
  if (isUserCancelledError(err)) {
    return new AuthError(AuthErrorCode.PASSKEY_CANCELLED, "Authentication was cancelled.", {
      cause: err,
    });
  }
  if (/PRF|hmac-secret/i.test(msg)) {
    return new AuthError(
      AuthErrorCode.PASSKEY_PRF_UNSUPPORTED,
      "Device does not support PRF (hmac-secret) extension.",
      { cause: err }
    );
  }
  return new AuthError(AuthErrorCode.PASSKEY_FAILED, "Passkey authentication failed.", {
    cause: err,
  });
}
