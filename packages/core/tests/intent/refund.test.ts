import { describe, it, expect, vi } from "vitest";
import type { Intent, RawShinobiIntent } from "@shinobi-cash/data";
import {
  isIntentRefundable,
  getRefundType,
  getRefundChainId,
  getTimeUntilRefundable,
  getRefundFeeBps,
  toContractIntentStruct,
  encodeRefundCallData,
} from "../../src/intent/index.js";

const POOL_CHAIN_ID = 421614;

function makeIntent(overrides: Partial<Intent> = {}): Intent {
  return {
    orderId: "0x1234",
    intentType: "WITHDRAWAL",
    phase: "ESCROWED",
    user: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    inputToken: "0x0000000000000000000000000000000000000000",
    inputAmount: "1000000000000000000",
    outputToken: "0x0000000000000000000000000000000000000000",
    outputAmount: "950000000000000000",
    outputRecipient: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    originChainId: "84532",
    destinationChainId: "421614",
    fillDeadline: "1700000000",
    expires: String(Math.floor(Date.now() / 1000) - 3600), // expired 1hr ago
    escrowTxHash: "0xabc",
    escrowTimestamp: "1699999000",
    fillTxHash: null,
    fillChainId: null,
    fillTimestamp: null,
    solver: null,
    fillAmount: null,
    fillRecipient: null,
    pool: null,
    finalizeTxHash: null,
    finalizeChainId: null,
    finalizeTimestamp: null,
    refundTxHash: null,
    refundChainId: null,
    refundTimestamp: null,
    refundAmount: null,
    refundFee: null,
    ...overrides,
  };
}

function makeRawIntent(overrides: Partial<RawShinobiIntent> = {}): RawShinobiIntent {
  return {
    user: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    nonce: "1",
    originChainId: "84532",
    expires: "1700000000",
    fillDeadline: "1700000000",
    fillOracle: "0xcccccccccccccccccccccccccccccccccccccccc",
    inputs: [["0", "1000000000000000000"]],
    outputs: [
      {
        oracle: "0x000000000000000000000000dddddddddddddddddddddddddddddddddddddddd",
        settler: "0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        chainId: "421614",
        token: "0x0000000000000000000000000000000000000000000000000000000000000000",
        amount: "950000000000000000",
        recipient: "0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        call: "0x",
        context: "0x",
      },
    ],
    intentOracle: "0xffffffffffffffffffffffffffffffffffffffff",
    refundCalldata: "0x",
    ...overrides,
  };
}

describe("isIntentRefundable", () => {
  it("returns true for escrowed + expired intent", () => {
    const intent = makeIntent();
    expect(isIntentRefundable(intent)).toBe(true);
  });

  it("returns false for non-escrowed intent", () => {
    const intent = makeIntent({ phase: "FILLED" });
    expect(isIntentRefundable(intent)).toBe(false);
  });

  it("returns false for escrowed but not yet expired intent", () => {
    const intent = makeIntent({
      expires: String(Math.floor(Date.now() / 1000) + 3600),
    });
    expect(isIntentRefundable(intent)).toBe(false);
  });
});

describe("getRefundType", () => {
  it("returns deposit for DEPOSIT intent", () => {
    const intent = makeIntent({ intentType: "DEPOSIT" });
    expect(getRefundType(intent)).toBe("deposit");
  });

  it("returns withdrawal for WITHDRAWAL intent", () => {
    const intent = makeIntent({ intentType: "WITHDRAWAL" });
    expect(getRefundType(intent)).toBe("withdrawal");
  });
});

describe("getRefundChainId", () => {
  it("returns origin chain for deposit intents", () => {
    const intent = makeIntent({ intentType: "DEPOSIT", originChainId: "84532" });
    expect(getRefundChainId(intent, POOL_CHAIN_ID)).toBe(84532);
  });

  it("returns pool chain for withdrawal intents", () => {
    const intent = makeIntent({ intentType: "WITHDRAWAL" });
    expect(getRefundChainId(intent, POOL_CHAIN_ID)).toBe(POOL_CHAIN_ID);
  });
});

describe("getTimeUntilRefundable", () => {
  it("returns 0 for already expired intent", () => {
    const intent = makeIntent();
    expect(getTimeUntilRefundable(intent)).toBe(0);
  });

  it("returns positive ms for future expiry", () => {
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
    const intent = makeIntent({ expires: String(futureExpiry) });
    const remaining = getTimeUntilRefundable(intent);
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(3600 * 1000);
  });
});

describe("getRefundFeeBps", () => {
  it("returns null for undefined raw intent", () => {
    expect(getRefundFeeBps(undefined)).toBe(null);
  });

  it("returns null for empty refundCalldata", () => {
    expect(getRefundFeeBps(makeRawIntent({ refundCalldata: "0x" }))).toBe(null);
  });

  it("returns null for missing refundCalldata", () => {
    expect(getRefundFeeBps(makeRawIntent({ refundCalldata: "" }))).toBe(null);
  });
});

describe("toContractIntentStruct", () => {
  it("converts string fields to bigint/number", () => {
    const raw = makeRawIntent();
    const struct = toContractIntentStruct(raw);

    expect(struct.nonce).toBe(1n);
    expect(struct.originChainId).toBe(84532n);
    expect(struct.expires).toBe(1700000000);
    expect(struct.fillDeadline).toBe(1700000000);
    expect(struct.inputs[0]).toEqual([0n, 1000000000000000000n]);
    expect(struct.outputs[0]!.chainId).toBe(421614n);
    expect(struct.outputs[0]!.amount).toBe(950000000000000000n);
  });

  it("preserves hex addresses", () => {
    const raw = makeRawIntent();
    const struct = toContractIntentStruct(raw);
    expect(struct.user).toBe(raw.user);
    expect(struct.fillOracle).toBe(raw.fillOracle);
  });
});

describe("encodeRefundCallData", () => {
  it("produces valid hex calldata", () => {
    const raw = makeRawIntent();
    const calldata = encodeRefundCallData(raw);
    expect(calldata).toMatch(/^0x/);
    // The selector for refund((address,uint256,...)) is 4 bytes = 8 hex chars
    expect(calldata.length).toBeGreaterThan(10);
  });

  it("is deterministic for same input", () => {
    const raw = makeRawIntent();
    expect(encodeRefundCallData(raw)).toBe(encodeRefundCallData(raw));
  });
});
