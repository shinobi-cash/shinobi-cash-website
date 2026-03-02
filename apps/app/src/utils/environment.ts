/**
 * Environment Detection Utilities
 * Detects Farcaster mini app environment and other constraints
 */

export function isFarcasterEnvironment(): boolean {
  // Only run in browser
  if (typeof window === "undefined") {
    return false;
  }

  // Check if running in iframe (Farcaster mini apps run in iframes)
  const inIframe = window !== window.parent;

  // Check for Farcaster SDK presence
  const hasFarcasterSDK =
    window.location.hostname.includes("farcaster") || window.location.hostname.includes("warpcast");

  // Check user agent for Farcaster-specific indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const isFarcasterClient = userAgent.includes("farcaster") || userAgent.includes("warpcast");

  return inIframe || hasFarcasterSDK || isFarcasterClient;
}

export function isPasskeySupported(): boolean {
  // Only run in browser
  if (typeof window === "undefined") {
    return false;
  }

  // Check basic WebAuthn support
  if (!window.PublicKeyCredential) {
    return false;
  }

  // Check if we're in an environment that allows passkey creation
  if (isFarcasterEnvironment()) {
    return false; // Passkeys typically not allowed in Farcaster iframes
  }

  return true;
}
