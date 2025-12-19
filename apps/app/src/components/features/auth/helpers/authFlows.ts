import { AuthError, AuthErrorCode, mapPasskeyError } from "@/lib/errors/AuthError";
import { storageManager, KDF } from "@/lib/storage";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { restoreFromMnemonic } from "@shinobi-cash/core";
import { createHash } from "@/utils/crypto";
import { generateKeysFromRandomSeed } from "@shinobi-cash/core";

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
    publicKey: generatedKeys.publicKey,
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

/**
 * Perform wallet-based login for existing wallet-only accounts
 * Returns keys if account exists, null if account doesn't exist (new user)
 */
export async function performWalletLogin(
  signature: string,
  walletAddress: string
): Promise<KeyGenerationResult | null> {
  // Split signature into key generation seed and encryption key
  const signatureHex = signature.slice(2); // Remove '0x' prefix
  const keyGenSeed = signatureHex.slice(0, 64); // First 32 bytes for key generation
  const encryptionSeed = signatureHex.slice(64, 128); // Next 32 bytes for encryption

  // Convert encryption seed to Uint8Array
  const encryptionKey = new Uint8Array(
    encryptionSeed.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  // Use wallet address as account ID
  const accountId = walletAddress.toLowerCase();

  // Check if account exists
  const accountExists = await storageManager.accountExists(accountId);

  if (!accountExists) {
    // New account - return null to indicate account creation flow
    return null;
  }

  // Existing account - initialize session and load data
  try {
    await storageManager.initializeWalletAccountSession(accountId, encryptionKey);

    const accountData = await storageManager.getAccountData();
    if (!accountData) {
      // Account exists but data not found - treat as new account
      console.warn("Account exists but data not found, treating as new account");
      return null;
    }

    // Restore keys from stored mnemonic
    const { publicKey, privateKey, address } = restoreFromMnemonic(accountData.mnemonic);

    // Store session info (wallet-based auth)
    await KDF.storeSessionInfo(accountId, "passkey"); // Using "passkey" as auth method for now

    return { publicKey, privateKey, address, mnemonic: accountData.mnemonic } as KeyGenerationResult;
  } catch (error) {
    // Failed to decrypt or load account data - treat as new account
    console.warn("Failed to load account data, treating as new account:", error);
    return null;
  }
}

