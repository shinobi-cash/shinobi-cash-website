import { describe, it, expect } from "vitest";
import {
  classifyWithdrawal,
  calculateFeesFromBPS,
  calculateTotalGas,
  calculateRelayFeeBPS,
  calculateSolverFeeBPS,
} from "../../src/fees/index.js";
import {
  SAME_CHAIN_GAS_LIMITS,
  CROSS_CHAIN_GAS_LIMITS,
  WITHDRAW2_SAME_CHAIN_GAS_LIMITS,
  WITHDRAW2_CROSS_CHAIN_GAS_LIMITS,
  FEE_CONFIG,
} from "@shinobi-cash/constants";

describe("classifyWithdrawal", () => {
  it("returns same-chain when destinationChainId is undefined", () => {
    expect(classifyWithdrawal(undefined, 421614)).toBe("same-chain");
  });

  it("returns same-chain when destinationChainId matches poolChainId", () => {
    expect(classifyWithdrawal(421614, 421614)).toBe("same-chain");
  });

  it("returns cross-chain when destinationChainId differs", () => {
    expect(classifyWithdrawal(84532, 421614)).toBe("cross-chain");
  });
});

describe("calculateFeesFromBPS", () => {
  it("calculates fees correctly for 100 BPS relay + 0 solver", () => {
    const result = calculateFeesFromBPS(10000n, 100, 0);
    expect(result.executionFeeWei).toBe(100n); // 1%
    expect(result.solverFeeWei).toBe(0n);
    expect(result.totalFeeWei).toBe(100n);
  });

  it("calculates fees correctly for relay + solver", () => {
    const amount = 1000000000000000000n; // 1 ETH
    const result = calculateFeesFromBPS(amount, 150, 500);
    expect(result.executionFeeWei).toBe(15000000000000000n); // 1.5%
    expect(result.solverFeeWei).toBe(50000000000000000n); // 5%
    expect(result.totalFeeWei).toBe(65000000000000000n); // 6.5%
  });

  it("returns zero fees for zero BPS", () => {
    const result = calculateFeesFromBPS(1000000n, 0, 0);
    expect(result.executionFeeWei).toBe(0n);
    expect(result.solverFeeWei).toBe(0n);
    expect(result.totalFeeWei).toBe(0n);
  });
});

describe("calculateTotalGas", () => {
  it("sums all gas components for same-chain limits", () => {
    const total = calculateTotalGas(SAME_CHAIN_GAS_LIMITS);
    expect(total).toBe(
      SAME_CHAIN_GAS_LIMITS.CALL_GAS_LIMIT +
        SAME_CHAIN_GAS_LIMITS.VERIFICATION_GAS_LIMIT +
        SAME_CHAIN_GAS_LIMITS.PRE_VERIFICATION_GAS +
        SAME_CHAIN_GAS_LIMITS.PAYMASTER_VERIFICATION_GAS_LIMIT +
        SAME_CHAIN_GAS_LIMITS.POST_OP_GAS_LIMIT
    );
  });

  it("sums all gas components for cross-chain limits", () => {
    const total = calculateTotalGas(CROSS_CHAIN_GAS_LIMITS);
    expect(total).toBeGreaterThan(calculateTotalGas(SAME_CHAIN_GAS_LIMITS));
  });

  it("sums all gas components for withdraw2 same-chain limits", () => {
    const total = calculateTotalGas(WITHDRAW2_SAME_CHAIN_GAS_LIMITS);
    expect(total).toBeGreaterThan(calculateTotalGas(SAME_CHAIN_GAS_LIMITS));
  });

  it("sums all gas components for withdraw2 cross-chain limits", () => {
    const total = calculateTotalGas(WITHDRAW2_CROSS_CHAIN_GAS_LIMITS);
    expect(total).toBeGreaterThan(
      calculateTotalGas(WITHDRAW2_SAME_CHAIN_GAS_LIMITS)
    );
  });
});

describe("calculateRelayFeeBPS", () => {
  it("calculates BPS with buffer", () => {
    // gas cost is 1% of withdrawal → 100 BPS, buffered to ceil(100 * 1.02) = 102
    const bps = calculateRelayFeeBPS(1000000n, 10000n, 1500);
    expect(bps).toBe(102);
  });

  it("clamps to minimum 1 BPS", () => {
    // Very tiny gas relative to withdrawal
    const bps = calculateRelayFeeBPS(10000000000000000000n, 1n, 1500);
    expect(bps).toBe(1);
  });

  it("clamps to maxBPS", () => {
    // Gas cost exceeds max allowed fee
    const bps = calculateRelayFeeBPS(100n, 100000n, 1500);
    expect(bps).toBe(1500);
  });

  it("uses the provided maxBPS cap", () => {
    const bps = calculateRelayFeeBPS(100n, 100000n, 500);
    expect(bps).toBe(500);
  });
});

describe("calculateSolverFeeBPS", () => {
  it("returns 0 for same-chain", () => {
    expect(calculateSolverFeeBPS("same-chain")).toBe(0);
  });

  it("returns default solver fee for cross-chain", () => {
    expect(calculateSolverFeeBPS("cross-chain")).toBe(
      FEE_CONFIG.DEFAULT_SOLVER_FEE_BPS
    );
  });

  it("accepts custom cross-chain solver fee", () => {
    expect(calculateSolverFeeBPS("cross-chain", 300)).toBe(300);
  });

  it("ignores custom fee for same-chain", () => {
    expect(calculateSolverFeeBPS("same-chain", 300)).toBe(0);
  });
});
