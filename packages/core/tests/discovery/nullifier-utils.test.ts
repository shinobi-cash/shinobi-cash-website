/**
 * Tests for nullifier-utils.ts
 */

import { describe, it, expect } from "vitest";
import {
  deriveNullifier,
  hashNullifier,
  deriveAndHashNullifier,
  deriveDepositPrecommitment,
} from "../../src/discovery/nullifier-utils.js";
import { TEST_POOL_ADDRESS, TEST_ACCOUNT_KEY, TEST_CHAIN_ID } from "./fixtures.js";

describe("nullifier-utils", () => {
  describe("deriveNullifier", () => {
    it("should derive deposit nullifier for changeIndex 0", () => {
      const nullifier = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);

      expect(typeof nullifier).toBe("bigint");
      expect(nullifier).toBeGreaterThan(0n);
    });

    it("should derive change nullifier for changeIndex > 0", () => {
      const nullifier = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 1);

      expect(typeof nullifier).toBe("bigint");
      expect(nullifier).toBeGreaterThan(0n);
    });

    it("should produce different nullifiers for different depositIndex", () => {
      const nullifier0 = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
      const nullifier1 = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 0);

      expect(nullifier0).not.toBe(nullifier1);
    });

    it("should produce different nullifiers for different changeIndex", () => {
      const nullifier0 = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
      const nullifier1 = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 1);

      expect(nullifier0).not.toBe(nullifier1);
    });

    it("should produce different nullifiers for different accountKey", () => {
      const nullifier0 = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
      const nullifier1 = deriveNullifier(
        TEST_ACCOUNT_KEY + 1n,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        0,
        0
      );

      expect(nullifier0).not.toBe(nullifier1);
    });

    it("should produce different nullifiers for different poolAddress", () => {
      const nullifier0 = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
      const nullifier1 = deriveNullifier(
        TEST_ACCOUNT_KEY,
        "0x9999999999999999999999999999999999999999",
        TEST_CHAIN_ID,
        0,
        0
      );

      expect(nullifier0).not.toBe(nullifier1);
    });

    it("should be deterministic", () => {
      const nullifier1 = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 5, 3);
      const nullifier2 = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 5, 3);

      expect(nullifier1).toBe(nullifier2);
    });

    it("should produce different nullifiers for different chainId", () => {
      const arbitrumChainId = "421614";
      const baseChainId = "84532";
      const nullifierArbitrum = deriveNullifier(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        arbitrumChainId,
        0,
        0
      );
      const nullifierBase = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, baseChainId, 0, 0);

      expect(nullifierArbitrum).not.toBe(nullifierBase);
    });

    it("should accept chainId as number, bigint, or string", () => {
      const nullifierNumber = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 421614, 0, 0);
      const nullifierBigint = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 421614n, 0, 0);
      const nullifierString = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, "421614", 0, 0);

      expect(nullifierNumber).toBe(nullifierBigint);
      expect(nullifierNumber).toBe(nullifierString);
    });
  });

  describe("hashNullifier", () => {
    it("should return a string", () => {
      const nullifier = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
      const hash = hashNullifier(nullifier);

      expect(typeof hash).toBe("string");
    });

    it("should produce different hashes for different nullifiers", () => {
      const hash1 = hashNullifier(12345n);
      const hash2 = hashNullifier(12346n);

      expect(hash1).not.toBe(hash2);
    });

    it("should be deterministic", () => {
      const hash1 = hashNullifier(12345n);
      const hash2 = hashNullifier(12345n);

      expect(hash1).toBe(hash2);
    });

    it("should handle zero", () => {
      const hash = hashNullifier(0n);

      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should handle large numbers", () => {
      const largeNumber = 2n ** 250n;
      const hash = hashNullifier(largeNumber);

      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe("deriveAndHashNullifier", () => {
    it("should return a string hash", () => {
      const hash = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);

      expect(typeof hash).toBe("string");
    });

    it("should be equivalent to deriveNullifier + hashNullifier", () => {
      const nullifier = deriveNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
      const expectedHash = hashNullifier(nullifier);
      const actualHash = deriveAndHashNullifier(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        0,
        0
      );

      expect(actualHash).toBe(expectedHash);
    });

    it("should produce unique hashes for different positions", () => {
      const hash00 = deriveAndHashNullifier(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        0,
        0
      );
      const hash01 = deriveAndHashNullifier(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        0,
        1
      );
      const hash10 = deriveAndHashNullifier(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        1,
        0
      );

      expect(hash00).not.toBe(hash01);
      expect(hash00).not.toBe(hash10);
      expect(hash01).not.toBe(hash10);
    });

    it("should be deterministic", () => {
      const hash1 = deriveAndHashNullifier(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        5,
        3
      );
      const hash2 = deriveAndHashNullifier(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        5,
        3
      );

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different chainId", () => {
      const arbitrumChainId = "421614";
      const baseChainId = "84532";
      const hashArbitrum = deriveAndHashNullifier(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        arbitrumChainId,
        0,
        0
      );
      const hashBase = deriveAndHashNullifier(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        baseChainId,
        0,
        0
      );

      expect(hashArbitrum).not.toBe(hashBase);
    });
  });

  describe("deriveDepositPrecommitment", () => {
    it("should return a string", () => {
      const precommitment = deriveDepositPrecommitment(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        0
      );

      expect(typeof precommitment).toBe("string");
    });

    it("should produce different precommitments for different depositIndex", () => {
      const precommitment0 = deriveDepositPrecommitment(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        0
      );
      const precommitment1 = deriveDepositPrecommitment(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        1
      );

      expect(precommitment0).not.toBe(precommitment1);
    });

    it("should produce different precommitments for different accountKey", () => {
      const precommitment0 = deriveDepositPrecommitment(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        0
      );
      const precommitment1 = deriveDepositPrecommitment(
        TEST_ACCOUNT_KEY + 1n,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        0
      );

      expect(precommitment0).not.toBe(precommitment1);
    });

    it("should produce different precommitments for different poolAddress", () => {
      const precommitment0 = deriveDepositPrecommitment(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        0
      );
      const precommitment1 = deriveDepositPrecommitment(
        TEST_ACCOUNT_KEY,
        "0x9999999999999999999999999999999999999999",
        TEST_CHAIN_ID,
        0
      );

      expect(precommitment0).not.toBe(precommitment1);
    });

    it("should be deterministic", () => {
      const precommitment1 = deriveDepositPrecommitment(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        5
      );
      const precommitment2 = deriveDepositPrecommitment(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        5
      );

      expect(precommitment1).toBe(precommitment2);
    });

    it("should handle sequential deposit indices", () => {
      const precommitments = [];
      for (let i = 0; i < 10; i++) {
        precommitments.push(
          deriveDepositPrecommitment(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, i)
        );
      }

      // All should be unique
      const uniqueSet = new Set(precommitments);
      expect(uniqueSet.size).toBe(10);
    });

    it("should produce different precommitments for different chainId (per-chain index space)", () => {
      const arbitrumChainId = "421614";
      const baseChainId = "84532";

      // Same depositIndex (0) on different chains should produce different precommitments
      const precommitmentArbitrum = deriveDepositPrecommitment(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        arbitrumChainId,
        0
      );
      const precommitmentBase = deriveDepositPrecommitment(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        baseChainId,
        0
      );

      expect(precommitmentArbitrum).not.toBe(precommitmentBase);
    });

    it("should accept chainId as number, bigint, or string", () => {
      const precommitmentNumber = deriveDepositPrecommitment(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        421614,
        0
      );
      const precommitmentBigint = deriveDepositPrecommitment(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        421614n,
        0
      );
      const precommitmentString = deriveDepositPrecommitment(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        "421614",
        0
      );

      expect(precommitmentNumber).toBe(precommitmentBigint);
      expect(precommitmentNumber).toBe(precommitmentString);
    });
  });
});
