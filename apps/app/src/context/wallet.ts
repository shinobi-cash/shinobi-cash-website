/**
 * Lazy-loaded wallet modal
 * Only imports @reown/appkit when actually needed (user clicks Connect Wallet)
 */

import { wagmiAdapter, projectId, networks } from "@/config";

type AppKitModal = Awaited<ReturnType<typeof import("@reown/appkit/react").createAppKit>>;

// Singleton for the modal instance
let modalInstance: AppKitModal | null = null;
let modalPromise: Promise<AppKitModal> | null = null;

// Event subscribers for modal close
type ModalCloseCallback = () => void;
const closeCallbacks = new Set<ModalCloseCallback>();
let eventsSubscribed = false;

const metadata = {
  name: "Shinobi Cash",
  description: "One click, borderless and complaint privacy",
  url:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://testnet.shinobi.cash",
  icons: ["https://testnet.shinobi.cash/icon.svg"],
};

async function createModal(): Promise<AppKitModal> {
  const { createAppKit } = await import("@reown/appkit/react");

  return createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks,
    metadata,
    themeMode: "dark",
    features: {
      analytics: false,
      email: false,
      onramp: false,
      connectMethodsOrder: ["wallet"],
      emailShowWallets: false,
      history: false,
      receive: false,
      reownAuthentication: false,
      send: false,
      socials: false,
      swaps: false,
    },
    themeVariables: {
      "--w3m-accent": "#f97316",
    },
  });
}

/**
 * Get or create the modal instance (lazy)
 */
async function getModal(): Promise<AppKitModal> {
  if (modalInstance) return modalInstance;

  if (!modalPromise) {
    modalPromise = createModal().then((modal) => {
      modalInstance = modal;
      return modal;
    });
  }

  return modalPromise;
}

/**
 * Subscribe to AppKit events after modal is created
 */
async function subscribeToEvents(): Promise<void> {
  if (eventsSubscribed) return;

  const modal = await getModal();
  eventsSubscribed = true;

  // Subscribe to modal events
  modal.subscribeEvents((event) => {
    if (event.data.event === "MODAL_CLOSE") {
      closeCallbacks.forEach((cb) => cb());
    }
  });
}

/**
 * Open the wallet connection modal
 * Lazily loads AppKit on first call
 * @param onClose - Optional callback when modal is closed
 */
export async function openWalletModal(onClose?: ModalCloseCallback): Promise<void> {
  const modal = await getModal();

  // Subscribe to events if not already
  await subscribeToEvents();

  // Register close callback if provided
  if (onClose) {
    closeCallbacks.add(onClose);
    // Auto-cleanup after modal closes
    const cleanup = () => {
      closeCallbacks.delete(onClose);
      closeCallbacks.delete(cleanup);
    };
    closeCallbacks.add(cleanup);
  }

  modal.open();
}

/**
 * Close the wallet modal
 */
export async function closeWalletModal(): Promise<void> {
  if (modalInstance) {
    modalInstance.close();
  }
}
