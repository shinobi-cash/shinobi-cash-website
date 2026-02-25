import { accountService } from "@/services/AccountService";
import { accountRepo } from "@/lib/storage/repositories/AccountRepository";
import {
  getStoredSessionInfo,
  clearSessionInfo,
  storeSessionInfo,
} from "@/lib/storage/repositories/SessionRepository";
import { keyDerivationService } from "@/services/KeyDerivationService";
import { deriveWalletCredentials } from "@/lib/auth";
import { proxy } from "valtio";
import { type AppError, logError, isUserCancellation } from "@/lib/errors/errors";
import { showToast } from "@/lib/toast";

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
}

const state = proxy<AuthControllerState>({
  state: { status: "booting" },
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
    } catch (error) {
      logError(error, { action: "bootstrap", component: "AuthController" });
      // Clear session and reset to unauthenticated on bootstrap failure
      // This is intentional - a failed passkey login should allow manual login
      await clearSessionInfo().catch(() => {});
      this.state.state = { status: "unauthenticated" };

      // Notify user unless they cancelled the biometric prompt
      if (!isUserCancellation(error)) {
        showToast.info("Quick Unlock failed. Please sign in with your wallet.");
      }
    }
  },

  async logout() {
    await clearSessionInfo();
    accountService.clearInMemorySession();
    this.state.state = { status: "unauthenticated" };
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
    // SDK: derive account identity + private key
    const { accountId, privateKey } = await deriveWalletCredentials(signature, chainId, walletAddress);

    // App: derive storage encryption key (KEK)
    const kek = await keyDerivationService.deriveKEKFromWallet(signature, chainId, walletAddress);

    const exists = await accountRepo.accountExists(accountId);

    if (!exists) {
      await accountService.createWalletAccount(accountId, kek, privateKey);
    } else {
      await accountService.loginWithWalletKEK(accountId, kek);
    }

    // Load credentialId from account metadata BEFORE storing session
    // This ensures session is stored atomically with correct credentialId
    const metadata = await accountService.getAccountMetadata();

    // Store session with credentialId in single atomic operation
    await storeSessionInfo(accountId, {
      credentialId: metadata?.credentialId,
    });

    const passkeyEnabled = !!metadata?.credentialId;

    this.state.state = {
      status: "authenticated",
      session: { accountId, authenticatedAt: Date.now(), passkeyEnabled },
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

  isAuthenticated(): boolean {
    return this.state.state.status === "authenticated";
  },
};
