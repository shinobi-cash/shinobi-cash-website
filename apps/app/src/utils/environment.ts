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

export function getEnvironmentType(): "farcaster" | "standalone" | "iframe" | "web" {
  // Only run in browser
  if (typeof window === "undefined") {
    return "web";
  }

  if (isFarcasterEnvironment()) {
    return "farcaster";
  }

  if (window !== window.parent) {
    return "iframe";
  }

  // Check if opened as standalone app (PWA)
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return "standalone";
  }

  return "web";
}

export function getAuthenticationMethod(): "passkey" | "signature" | "simple" {
  const envType = getEnvironmentType();

  switch (envType) {
    case "farcaster":
      return "signature"; // Use message signing instead of passkeys
    case "iframe":
      return "signature"; // Most iframes don't allow passkeys
    case "standalone":
    case "web":
      return isPasskeySupported() ? "passkey" : "signature";
    default:
      return "signature";
  }
}

export function shouldShowEnvironmentWarning(): boolean {
  const envType = getEnvironmentType();
  return envType === "iframe" && !isFarcasterEnvironment();
}
