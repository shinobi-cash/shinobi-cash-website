import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { VIEM_SUPPORTED_CHAINS } from "@/config/chains";

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "b56e18d47c72ab683b10814fe9495694";

if (!projectId) {
  throw new Error("Project ID is not defined");
}

export const networks = VIEM_SUPPORTED_CHAINS as [AppKitNetwork, ...AppKitNetwork[]];

// Singleton pattern to prevent double initialization during HMR
const globalForWagmi = globalThis as unknown as { wagmiAdapter?: WagmiAdapter };

function createWagmiAdapter() {
  return new WagmiAdapter({
    ssr: true,
    projectId,
    networks,
  });
}

export const wagmiAdapter = globalForWagmi.wagmiAdapter ?? createWagmiAdapter();
if (process.env.NODE_ENV !== "production") globalForWagmi.wagmiAdapter = wagmiAdapter;

export const config = wagmiAdapter.wagmiConfig;
