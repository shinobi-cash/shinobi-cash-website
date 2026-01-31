import { accountService } from "@/services/AccountService";
import { accountRepo } from "@/lib/storage/repositories/AccountRepository";
import {
  getStoredSessionInfo,
  updateSessionLastAuth,
  clearSessionInfo,
  storeSessionInfo,
} from "@/lib/storage/repositories/SessionRepository";
import { keyDerivationService } from "@/services/KeyDerivationService";
import {
  parseUserKey,
  deriveKeysFromSignature,
  generateKeysFromRandomSeed,
  getWalletAccountId,
} from "@shinobi-cash/core";
import { proxy } from "valtio";
import { type AppError, logError } from "@/lib/errors/errors";

/**
 * Crypto context (public key + account key)
 * Single source of truth for crypto material, owned by AuthController
 */
export interface CryptoContext {
  publicKey: string | null;
  accountKey: bigint | null;
  cryptoReady: boolean;
}

type AuthSession = {
  accountId: string;
  authenticatedAt: number;
  passkeyEnabled: boolean;
};

type AuthState =
  | { status: "booting" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; session: AuthSession }
  | { status: "error"; error: AppError };

interface AuthControllerState {
  state: AuthState;
  crypto: CryptoContext;
}

const state = proxy<AuthControllerState>({
  state: { status: "booting" },
  crypto: {
    publicKey: null,
    accountKey: null,
    cryptoReady: false,
  },
});

export const AuthController = {
  state,

  async bootstrap() {
    try {
      const session = await getStoredSessionInfo();

      if (session?.credentialId) {
        const kek = await keyDerivationService.deriveKEKFromPasskey(
          session.accountId,
          session.credentialId
        );

        await accountService.loginWithPasskeyKEK(session.accountId, kek);

        // If we reach here, login succeeded (would throw otherwise)
        await updateSessionLastAuth();

        // Check passkey status after successful login
        const passkeyEnabled = await this.isPasskeyEnabled();

        // Load crypto context immediately after successful login
        const accountData = await accountService.getAccountData();

        // Update auth state
        this.state.state = {
          status: "authenticated",
          session: {
            accountId: session.accountId,
            authenticatedAt: Date.now(),
            passkeyEnabled,
          },
        };

        // Update crypto context atomically
        this.state.crypto = {
          publicKey: accountData.publicKey ?? null,
          accountKey: parseUserKey(accountData.privateKey),
          cryptoReady: true,
        };

        return;
      }

      this.state.state = { status: "unauthenticated" };
    } catch (error) {
      logError(error, { action: "bootstrap", component: "AuthController" });
      // Clear session and reset to unauthenticated on bootstrap failure
      // This is intentional - a failed passkey login should allow manual login
      await clearSessionInfo().catch(() => {});
      this.state.state = { status: "unauthenticated" };
      this._clearCrypto();
    }
  },

  async logout() {
    await clearSessionInfo();
    accountService.clearInMemorySession();
    this.state.state = { status: "unauthenticated" };
    this._clearCrypto();
  },

  async signInWithWallet({
    walletAddress,
    chainId,
    signature,
  }: {
    walletAddress: `0x${string}`;
    chainId: number;
    signature: `0x${string}`;
  }) {
    const accountId = getWalletAccountId(walletAddress, chainId);

    const { encryptionKey, keyGenSeed } = await deriveKeysFromSignature(
      signature,
      chainId,
      walletAddress
    );

    const exists = await accountRepo.accountExists(accountId);

    if (!exists) {
      const keys = generateKeysFromRandomSeed(keyGenSeed);
      await accountService.createWalletAccount(accountId, encryptionKey, keys.privateKey);
    } else {
      await accountService.loginWithWalletKEK(accountId, encryptionKey);
    }

    // Load credentialId from account metadata BEFORE storing session
    // This ensures session is stored atomically with correct credentialId
    const metadata = await accountService.getAccountMetadata();

    // Store session with credentialId in single atomic operation
    await storeSessionInfo(accountId, {
      credentialId: metadata?.credentialId,
    });

    // Set authenticated state with passkey status
    const passkeyEnabled = !!metadata?.credentialId;

    // Load crypto context immediately after successful login
    const accountData = await accountService.getAccountData();

    // Update auth state
    this.state.state = {
      status: "authenticated",
      session: { accountId: accountId, authenticatedAt: Date.now(), passkeyEnabled },
    };

    // Update crypto context atomically
    this.state.crypto = {
      publicKey: accountData.publicKey ?? null,
      accountKey: parseUserKey(accountData.privateKey),
      cryptoReady: true,
    };
  },

  /**
   * Step 1: Register passkey credential (first biometric prompt)
   */
  async registerPasskeyCredential(): Promise<string> {
    return await accountService.registerPasskeyCredential();
  },

  /**
   * Step 2: Complete passkey setup (second biometric prompt)
   */
  async completePasskeySetup(credentialId: string): Promise<void> {
    await accountService.completePasskeySetup(credentialId);

    // Update state to reflect passkey is now enabled
    if (this.state.state.status === "authenticated") {
      this.state.state.session.passkeyEnabled = true;
    }
  },

  /**
   * Enable passkey in one call (combines both steps)
   */
  async enablePasskey(): Promise<void> {
    const credentialId = await this.registerPasskeyCredential();
    await this.completePasskeySetup(credentialId);
  },

  async removePasskey(): Promise<void> {
    await accountService.removePasskeyForCurrentAccount();

    // Update state to reflect passkey is now disabled
    if (this.state.state.status === "authenticated") {
      this.state.state.session.passkeyEnabled = false;
    }
  },

  async isPasskeyEnabled(): Promise<boolean> {
    try {
      const accountData = await accountService.getAccountMetadata();
      return !!accountData?.credentialId;
    } catch (error) {
      logError(error, { action: "isPasskeyEnabled", component: "AuthController" });
      return false;
    }
  },

  _clearCrypto(): void {
    this.state.crypto = {
      publicKey: null,
      accountKey: null,
      cryptoReady: false,
    };
  },
};
