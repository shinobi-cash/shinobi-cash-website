import { AuthError, AuthErrorCode, mapPasskeyError } from "@/lib/errors/AuthError";
import { storageManager, KDF } from "@/lib/storage";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { restoreFromMnemonic } from "@shinobi-cash/core";
import { createHash } from "@/utils/crypto";

export async function performPasskeyLogin(accountName: string) {
  const trimmed = accountName.trim();
  const passkeyData = await storageManager.getPasskeyData(trimmed);
  if (!passkeyData) {
    throw new AuthError(
      AuthErrorCode.PASSKEY_NOT_FOUND,
      `No passkey found for account '${trimmed}'. Please create one first.`,
    );
  }

  let symmetricKey: CryptoKey;
  try {
    ({ symmetricKey } = await KDF.deriveKeyFromPasskey(trimmed, passkeyData.credentialId));
  } catch (err) {
    throw mapPasskeyError(err);
  }
  await storageManager.initializeAccountSession(trimmed, symmetricKey);

  const accountData = await storageManager.getAccountData();
  if (!accountData) throw new AuthError(AuthErrorCode.ACCOUNT_NOT_FOUND, "Account data not found");

  const { publicKey, privateKey, address } = restoreFromMnemonic(accountData.mnemonic);
  await KDF.storeSessionInfo(trimmed, "passkey", { credentialId: passkeyData.credentialId });
  return { publicKey, privateKey, address, mnemonic: accountData.mnemonic } as KeyGenerationResult;
}

export async function performPasswordLogin(accountName: string, password: string) {
  const trimmed = accountName.trim();
  const { symmetricKey } = await KDF.deriveKeyFromPassword(password, trimmed);
  await storageManager.initializeAccountSession(trimmed, symmetricKey);

  const accountData = await storageManager.getAccountData();
  if (!accountData) {
    throw new AuthError(AuthErrorCode.INVALID_CREDENTIALS, "Account not found or incorrect password");
  }

  const { publicKey, privateKey, address } = restoreFromMnemonic(accountData.mnemonic);
  await KDF.storeSessionInfo(trimmed, "password");
  return { publicKey, privateKey, address, mnemonic: accountData.mnemonic } as KeyGenerationResult;
}

export async function performPasskeySetup(accountName: string, generatedKeys: KeyGenerationResult) {
  const trimmed = accountName.trim();
  const hasPasskey = await storageManager.passkeyExists(trimmed);
  if (hasPasskey) {
    throw new AuthError(AuthErrorCode.ACCOUNT_ALREADY_EXISTS, "Passkey already exists for this account");
  }

  const userHandle = await createHash(generatedKeys.publicKey);
  let credentialId: string;
  try {
    ({ credentialId } = await KDF.createPasskeyCredential(trimmed, userHandle));
  } catch (err) {
    throw mapPasskeyError(err);
  }
  let symmetricKey: CryptoKey;
  try {
    ({ symmetricKey } = await KDF.deriveKeyFromPasskey(trimmed, credentialId));
  } catch (err) {
    throw mapPasskeyError(err);
  }

  await storageManager.initializeAccountSession(trimmed, symmetricKey);

  await storageManager.storeAccountData({
    accountName: trimmed,
    mnemonic: generatedKeys.mnemonic,
    createdAt: Date.now(),
  });

  await storageManager.storePasskeyData({
    accountName: trimmed,
    credentialId,
    publicKeyHash: userHandle,
    created: Date.now(),
  });

  await KDF.storeSessionInfo(trimmed, "passkey", { credentialId });
}

export async function performPasswordSetup(accountName: string, generatedKeys: KeyGenerationResult, password: string) {
  const trimmed = accountName.trim();
  const { symmetricKey } = await KDF.deriveKeyFromPassword(password, trimmed);
  await storageManager.initializeAccountSession(trimmed, symmetricKey);

  try {
    await storageManager.storeAccountData({
      accountName: trimmed,
      mnemonic: generatedKeys.mnemonic,
      createdAt: Date.now(),
    });
  } catch (err) {
    throw new AuthError(AuthErrorCode.DB_ERROR, "Failed to store account data", { cause: err });
  }

  await KDF.storeSessionInfo(trimmed, "password");
}
