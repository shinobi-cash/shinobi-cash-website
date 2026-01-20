/**
 * Hash Type Definitions
 *
 * Standardizes hash representation across the codebase to prevent mismatches.
 * All hashes are represented as decimal strings (BigInt.toString() format).
 */

/**
 * Commitment hash in decimal string format
 *
 * Standard representation for all Poseidon hashes in the system.
 * Always produced by BigInt.toString(), never 0x-prefixed hex.
 *
 * @example "12345678901234567890" (decimal)
 * @example NOT "0x123abc..." (hex)
 */
export type CommitmentHash = string;

/**
 * Nullifier hash in decimal string format
 *
 * Derived from Poseidon hash, always decimal string representation.
 */
export type NullifierHash = string;

/**
 * Precommitment hash in decimal string format
 *
 * Provided by indexer, must match our cryptographic derivations.
 * Always decimal string for consistency with Poseidon outputs.
 */
export type PrecommitmentHash = string;

/**
 * Pool address - Ethereum address with 0x prefix
 *
 * Prevents accidentally passing incorrect addresses (like entrypoint address).
 * Must be a valid checksummed Ethereum address.
 *
 * @example "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 */
export type PoolAddress = `0x${string}`;

/**
 * Convert BigInt to standard hash format (decimal string)
 *
 * @param value - BigInt value to convert
 * @returns Decimal string representation
 */
export function toHashString(value: bigint): CommitmentHash {
  return value.toString();
}

/**
 * Convert hash string back to BigInt
 *
 * @param hash - Hash in decimal string format
 * @returns BigInt value
 */
export function fromHashString(hash: CommitmentHash): bigint {
  return BigInt(hash);
}
