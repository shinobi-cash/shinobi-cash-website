import { describe, it, expect } from "vitest";
import {
  resolveDepositRoute,
  buildDepositCallParams,
  isDepositSupported,
} from "../../src/deposit/index.js";

const POOL_CHAIN_ID = 421614; // Arbitrum Sepolia
const CROSS_CHAIN_ID = 84532; // Base Sepolia
const UNSUPPORTED_CHAIN = 999999;

describe("resolveDepositRoute", () => {
  it("returns same-chain route for pool chain", () => {
    const route = resolveDepositRoute(POOL_CHAIN_ID);
    expect(route.isCrossChain).toBe(false);
    expect(route.functionName).toBe("deposit");
    expect(route.chainId).toBe(POOL_CHAIN_ID);
    expect(route.address).toMatch(/^0x/);
  });

  it("returns cross-chain route for supported chain", () => {
    const route = resolveDepositRoute(CROSS_CHAIN_ID);
    expect(route.isCrossChain).toBe(true);
    expect(route.functionName).toBe("deposit");
    expect(route.chainId).toBe(CROSS_CHAIN_ID);
    expect(route.address).toMatch(/^0x/);
  });

  it("throws for unsupported chain", () => {
    expect(() => resolveDepositRoute(UNSUPPORTED_CHAIN)).toThrow("Unsupported deposit chain");
  });
});

describe("buildDepositCallParams", () => {
  const precommitment = 12345n;
  const settings = {
    solverFeeBPS: 500,
    fillDeadlineSeconds: 300,
    expirySeconds: 600,
  };

  it("builds same-chain params with single arg", () => {
    const route = resolveDepositRoute(POOL_CHAIN_ID);
    const params = buildDepositCallParams(route, precommitment, settings, true);
    expect(params.args).toEqual([precommitment]);
    expect(params.functionName).toBe("deposit");
  });

  it("builds cross-chain default params", () => {
    const route = resolveDepositRoute(CROSS_CHAIN_ID);
    const params = buildDepositCallParams(route, precommitment, settings, true);
    expect(params.args).toEqual([precommitment]);
    expect(params.functionName).toBe("deposit");
  });

  it("builds cross-chain custom params", () => {
    const route = resolveDepositRoute(CROSS_CHAIN_ID);
    const params = buildDepositCallParams(route, precommitment, settings, false);
    expect(params.functionName).toBe("depositWithCustomParams");
    expect(params.args).toEqual([precommitment, 500n, 300, 600]);
  });
});

describe("isDepositSupported", () => {
  it("returns true for pool chain", () => {
    expect(isDepositSupported(POOL_CHAIN_ID)).toBe(true);
  });

  it("returns true for supported cross-chain", () => {
    expect(isDepositSupported(CROSS_CHAIN_ID)).toBe(true);
  });

  it("returns false for unsupported chain", () => {
    expect(isDepositSupported(UNSUPPORTED_CHAIN)).toBe(false);
  });
});
