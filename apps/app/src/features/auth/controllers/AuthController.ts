import { accountService } from "@/lib/storage/account/AccountService";
import { repositoryRegistry } from "@/lib/storage/RepositoryRegistry";
import { keyDerivationService } from "@/lib/storage/services/KeyDerivationService";
import { proxy } from "valtio";
import { deriveKeysFromSignature, generateKeysFromRandomSeed, getWalletAccountId } from "../utils";

export enum AuthError {
  PASSKEY_NOT_FOUND = "PASSKEY_NOT_FOUND",
  PASSKEY_FAILED = "PASSKEY_FAILED",
  ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",
  ACCOUNT_ALREADY_EXISTS = "ACCOUNT_ALREADY_EXISTS",
  UNKNOWN = "UNKNOWN",
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
  | { status: "error"; error: AuthError };

const state = proxy<{ state: AuthState }>({
  state: { status: "booting" },
});

export const AuthController = {
  state,

  // ================= BOOTSTRAP =================

  async bootstrap() {
    try {
      const session = await repositoryRegistry.sessionRepo.getStoredSessionInfo();

      if (session?.credentialId) {
        const kek = await keyDerivationService.deriveKEKFromPasskey(
          session.accountId,
          session.credentialId
        );

        await accountService.loginWithPasskeyKEK(session.accountId, kek);

        // If we reach here, login succeeded (would throw otherwise)
        await repositoryRegistry.sessionRepo.updateSessionLastAuth();

        // Check passkey status after successful login
        const passkeyEnabled = await this.isPasskeyEnabled();

        this.state.state = {
          status: "authenticated",
          session: {
            accountId: session.accountId,
            authenticatedAt: Date.now(),
            passkeyEnabled,
          },
        };
        return;
      }

      this.state.state = { status: "unauthenticated" };
    } catch {
      this.state.state = { status: "unauthenticated" };
    }
  },

  async logout() {
    await repositoryRegistry.sessionRepo.clearSessionInfo();
    accountService.clearInMemorySession();
    this.state.state = { status: "unauthenticated" };
  },

  // ================= WALLET SIGN-IN =================

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

    const exists = await repositoryRegistry.accountRepo.accountExists(accountId);

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
    await repositoryRegistry.sessionRepo.storeSessionInfo(accountId, {
      credentialId: metadata?.credentialId,
    });

    // Set authenticated state with passkey status
    const passkeyEnabled = !!metadata?.credentialId;

    this.state.state = {
      status: "authenticated",
      session: { accountId: accountId, authenticatedAt: Date.now(), passkeyEnabled },
    };
  },

  // ================= PASSKEY ENABLE =================

  async enablePasskey(): Promise<void> {
    await accountService.enablePasskeyForCurrentAccount();

    // Update state to reflect passkey is now enabled
    if (this.state.state.status === "authenticated") {
      this.state.state.session.passkeyEnabled = true;
    }
  },

  // ================= PASSKEY REMOVE =================

  async removePasskey(): Promise<void> {
    await accountService.removePasskeyForCurrentAccount();

    // Update state to reflect passkey is now disabled
    if (this.state.state.status === "authenticated") {
      this.state.state.session.passkeyEnabled = false;
    }
  },

  // ================= PASSKEY STATUS =================

  /**
   * Check if passkey unlock is enabled for current account
   * @returns true if passkey is enabled (credentialId exists), false otherwise
   */
  async isPasskeyEnabled(): Promise<boolean> {
    try {
      const accountData = await accountService.getAccountMetadata();
      return !!accountData?.credentialId;
    } catch {
      return false;
    }
  },
};
