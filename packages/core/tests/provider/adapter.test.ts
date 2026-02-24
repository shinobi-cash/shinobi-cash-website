import { describe, it, expect, vi } from "vitest";
import type { ReadProvider, WriteProvider, SignProvider } from "../../src/provider/types.js";
import {
  createViemReadProvider,
  createViemWriteProvider,
  createViemSignProvider,
} from "../../src/provider/viem.js";

const TEST_ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;

describe("provider interfaces", () => {
  it("ReadProvider satisfies the interface with a plain object", () => {
    const provider: ReadProvider = {
      readContract: vi.fn().mockResolvedValue(42n),
      getChainId: vi.fn().mockResolvedValue(421614),
    };
    expect(provider).toBeDefined();
  });

  it("WriteProvider extends ReadProvider", () => {
    const provider: WriteProvider = {
      readContract: vi.fn().mockResolvedValue(42n),
      getChainId: vi.fn().mockResolvedValue(421614),
      sendTransaction: vi.fn().mockResolvedValue("0xtxhash"),
      getAccount: vi.fn().mockResolvedValue(TEST_ADDRESS),
    };
    expect(provider).toBeDefined();
  });

  it("SignProvider satisfies the interface", () => {
    const provider: SignProvider = {
      signTypedData: vi.fn().mockResolvedValue("0xsig"),
    };
    expect(provider).toBeDefined();
  });
});

describe("viem adapter", () => {
  describe("createViemReadProvider", () => {
    it("delegates readContract to the public client", async () => {
      const mockPublicClient = {
        readContract: vi.fn().mockResolvedValue(42n),
        getChainId: vi.fn().mockResolvedValue(421614),
      };

      const provider = createViemReadProvider(mockPublicClient);
      const result = await provider.readContract({
        address: TEST_ADDRESS,
        abi: [],
        functionName: "scope",
      });

      expect(result).toBe(42n);
      expect(mockPublicClient.readContract).toHaveBeenCalledWith({
        address: TEST_ADDRESS,
        abi: [],
        functionName: "scope",
      });
    });

    it("delegates getChainId to the public client", async () => {
      const mockPublicClient = {
        readContract: vi.fn(),
        getChainId: vi.fn().mockResolvedValue(421614),
      };

      const provider = createViemReadProvider(mockPublicClient);
      expect(await provider.getChainId()).toBe(421614);
    });
  });

  describe("createViemWriteProvider", () => {
    it("delegates sendTransaction to the wallet client", async () => {
      const mockPublicClient = {
        readContract: vi.fn(),
        getChainId: vi.fn().mockResolvedValue(421614),
      };
      const mockWalletClient = {
        sendTransaction: vi.fn().mockResolvedValue("0xtxhash" as `0x${string}`),
        account: { address: TEST_ADDRESS },
      };

      const provider = createViemWriteProvider(mockPublicClient, mockWalletClient);
      const txHash = await provider.sendTransaction({
        to: TEST_ADDRESS,
        data: "0x1234" as `0x${string}`,
      });

      expect(txHash).toBe("0xtxhash");
      expect(mockWalletClient.sendTransaction).toHaveBeenCalled();
    });

    it("returns account address from wallet client", async () => {
      const mockPublicClient = {
        readContract: vi.fn(),
        getChainId: vi.fn(),
      };
      const mockWalletClient = {
        sendTransaction: vi.fn(),
        account: { address: TEST_ADDRESS },
      };

      const provider = createViemWriteProvider(mockPublicClient, mockWalletClient);
      expect(await provider.getAccount()).toBe(TEST_ADDRESS);
    });
  });

  describe("createViemSignProvider", () => {
    it("delegates signTypedData to the wallet client", async () => {
      const mockWalletClient = {
        signTypedData: vi.fn().mockResolvedValue("0xsig" as `0x${string}`),
      };

      const provider = createViemSignProvider(mockWalletClient);
      const sig = await provider.signTypedData({
        domain: { name: "Test", version: "1", chainId: 1 },
        types: { Test: [{ name: "value", type: "uint256" }] },
        primaryType: "Test",
        message: { value: 42 },
      });

      expect(sig).toBe("0xsig");
      expect(mockWalletClient.signTypedData).toHaveBeenCalled();
    });
  });
});
