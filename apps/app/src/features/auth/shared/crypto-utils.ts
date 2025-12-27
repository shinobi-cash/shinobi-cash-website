/**
 * App-specific Cryptographic Utilities
 */

/**
 * Create privacy-preserving hash for indexing
 */
export async function createHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input.toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
