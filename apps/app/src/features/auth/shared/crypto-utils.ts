/**
 * Crypto Utilities
 * Standalone helper functions for hashing
 */

/**
 * Create privacy-preserving hash for indexing
 *
 * Uses SHA-256 to create deterministic hashes for lookup keys
 * without exposing the original values.
 *
 * @param input - String to hash
 * @returns Hex-encoded hash
 */
export async function createHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input.toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
