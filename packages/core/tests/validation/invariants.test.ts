import { describe, it, expect } from "vitest";
import {
  WithdrawalValidationError,
  validateWithdrawalRequest,
  validateFeeQuote,
  validateWithdrawalContext,
  validateWithdraw2Request,
  validateWithdraw2Context,
} from "../../src/validation/index.js";
import { FEE_CONFIG } from "@shinobi-cash/constants";

const ADDR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const POOL = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const makeNote = (overrides = {}) => ({
  amount: "1000000000000000000",
  depositIndex: 5,
  poolAddress: POOL,
  ...overrides,
});

function expectValidationError(fn: () => void, code: string) {
  try {
    fn();
    expect.unreachable("Expected WithdrawalValidationError");
  } catch (e) {
    expect(e).toBeInstanceOf(WithdrawalValidationError);
    expect((e as WithdrawalValidationError).code).toBe(code);
  }
}

describe("validateWithdrawalRequest", () => {
  const validRequest = {
    withdrawAmountWei: 500000000000000000n,
    note: makeNote(),
    recipient: ADDR,
  };

  it("accepts a valid request", () => {
    expect(() => validateWithdrawalRequest(validRequest)).not.toThrow();
  });

  it("rejects zero amount", () => {
    expectValidationError(
      () => validateWithdrawalRequest({ ...validRequest, withdrawAmountWei: 0n }),
      "INVALID_AMOUNT"
    );
  });

  it("rejects negative amount", () => {
    expectValidationError(
      () => validateWithdrawalRequest({ ...validRequest, withdrawAmountWei: -1n }),
      "INVALID_AMOUNT"
    );
  });

  it("rejects amount exceeding note balance", () => {
    expectValidationError(
      () =>
        validateWithdrawalRequest({
          ...validRequest,
          withdrawAmountWei: 2000000000000000000n,
        }),
      "INSUFFICIENT_BALANCE"
    );
  });

  it("rejects invalid recipient", () => {
    expectValidationError(
      () => validateWithdrawalRequest({ ...validRequest, recipient: "0xshort" }),
      "INVALID_RECIPIENT"
    );
  });

  it("rejects invalid destination chain ID", () => {
    expectValidationError(
      () => validateWithdrawalRequest({ ...validRequest, destinationChainId: -1 }),
      "INVALID_CHAIN_ID"
    );
  });

  it("accepts undefined destination chain ID", () => {
    expect(() =>
      validateWithdrawalRequest({ ...validRequest, destinationChainId: undefined })
    ).not.toThrow();
  });
});

describe("validateFeeQuote", () => {
  const validQuote = {
    relayFeeBPS: 100,
    netAmountWei: 900000000000000000n,
    totalFeeWei: 100000000000000000n,
  };

  it("accepts a valid fee quote", () => {
    expect(() => validateFeeQuote(validQuote)).not.toThrow();
  });

  it("rejects relay fee above max", () => {
    expectValidationError(
      () => validateFeeQuote({ ...validQuote, relayFeeBPS: FEE_CONFIG.MAX_RELAY_FEE_BPS + 1 }),
      "FEE_TOO_HIGH"
    );
  });

  it("rejects zero relay fee", () => {
    expectValidationError(
      () => validateFeeQuote({ ...validQuote, relayFeeBPS: 0 }),
      "ZERO_FEE_NOT_ALLOWED"
    );
  });

  it("rejects zero net amount", () => {
    expectValidationError(
      () => validateFeeQuote({ ...validQuote, netAmountWei: 0n }),
      "INSUFFICIENT_AMOUNT_AFTER_FEES"
    );
  });
});

describe("validateWithdrawalContext", () => {
  it("accepts valid context", () => {
    expect(() =>
      validateWithdrawalContext({
        poolScope: 1n,
        withdrawalData: ["0xaa", "0xbb"] as const,
      })
    ).not.toThrow();
  });

  it("rejects zero pool scope", () => {
    expectValidationError(
      () =>
        validateWithdrawalContext({
          poolScope: 0n,
          withdrawalData: ["0xaa", "0xbb"] as const,
        }),
      "INVALID_POOL_SCOPE"
    );
  });

  it("rejects wrong withdrawal data length", () => {
    expectValidationError(
      () =>
        validateWithdrawalContext({
          poolScope: 1n,
          withdrawalData: ["0xaa"] as unknown as readonly [`0x${string}`, `0x${string}`],
        }),
      "INVALID_WITHDRAWAL_DATA"
    );
  });
});

describe("validateWithdraw2Request", () => {
  const validRequest = {
    withdrawAmountWei: 500000000000000000n,
    primaryNote: makeNote({ depositIndex: 10 }),
    secondaryNote: makeNote({ depositIndex: 5 }),
    recipient: ADDR,
  };

  it("accepts a valid request", () => {
    expect(() => validateWithdraw2Request(validRequest)).not.toThrow();
  });

  it("rejects zero amount", () => {
    expectValidationError(
      () => validateWithdraw2Request({ ...validRequest, withdrawAmountWei: 0n }),
      "INVALID_AMOUNT"
    );
  });

  it("rejects amount exceeding combined balance", () => {
    expectValidationError(
      () =>
        validateWithdraw2Request({
          ...validRequest,
          withdrawAmountWei: 3000000000000000000n,
        }),
      "INSUFFICIENT_BALANCE"
    );
  });

  it("rejects invalid recipient", () => {
    expectValidationError(
      () => validateWithdraw2Request({ ...validRequest, recipient: "bad" }),
      "INVALID_RECIPIENT"
    );
  });

  it("rejects wrong note order", () => {
    expectValidationError(
      () =>
        validateWithdraw2Request({
          ...validRequest,
          primaryNote: makeNote({ depositIndex: 3 }),
          secondaryNote: makeNote({ depositIndex: 5 }),
        }),
      "INVALID_NOTE_ORDER"
    );
  });

  it("rejects pool mismatch", () => {
    expectValidationError(
      () =>
        validateWithdraw2Request({
          ...validRequest,
          primaryNote: makeNote({ depositIndex: 10, poolAddress: ADDR }),
          secondaryNote: makeNote({ depositIndex: 5, poolAddress: POOL }),
        }),
      "POOL_MISMATCH"
    );
  });

  it("rejects invalid label selector", () => {
    expectValidationError(
      () => validateWithdraw2Request({ ...validRequest, labelSelector: 2 }),
      "INVALID_LABEL_SELECTOR"
    );
  });

  it("accepts label selector 0 or 1", () => {
    expect(() => validateWithdraw2Request({ ...validRequest, labelSelector: 0 })).not.toThrow();
    expect(() => validateWithdraw2Request({ ...validRequest, labelSelector: 1 })).not.toThrow();
  });
});

describe("validateWithdraw2Context", () => {
  it("accepts valid context", () => {
    expect(() =>
      validateWithdraw2Context({
        poolScope: 1n,
        withdrawalData: ["0xaa", "0xbb"] as const,
      })
    ).not.toThrow();
  });

  it("rejects zero pool scope", () => {
    expectValidationError(
      () =>
        validateWithdraw2Context({
          poolScope: 0n,
          withdrawalData: ["0xaa", "0xbb"] as const,
        }),
      "INVALID_POOL_SCOPE"
    );
  });
});
