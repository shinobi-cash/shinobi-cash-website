/**
 * Regression baseline tests for viem → ox migration.
 *
 * These tests capture deterministic output from the current implementation.
 * After migrating to ox, these exact values must still match — proving
 * the migration is behavior-preserving.
 */
import { describe, it, expect } from "vitest";
import { createDeriveFn, derivePrecommitment } from "../../src/crypto/primitives.js";
import { parseUserKey, generateKeysFromRandomSeed, getWalletAccountId } from "../../src/auth/index.js";
import {
  createWithdrawalData,
  createCrossChainWithdrawalData,
  calculateContextHash,
  formatProofForContract,
  encodeRelayCallData,
  encodeRagequitCallData,
  deriveChangeNullifier,
  deriveChangeSecret,
  deriveRefundNullifier,
  deriveRefundSecret,
} from "../../src/withdrawal/index.js";
import { deriveDepositNullifier, deriveDepositSecret } from "../../src/deposit/index.js";

// ============ FIXED TEST INPUTS ============

const TEST_POOL = "0x1234567890123456789012345678901234567890";
const TEST_ACCOUNT_KEY = 12345678901234567890n;
const TEST_CHAIN_ID = 421614;
const TEST_DEPOSIT_INDEX = 0;
const TEST_CHANGE_INDEX = 1;
const TEST_RECIPIENT = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TEST_FEE_RECIPIENT = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const TEST_SEED = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const MOCK_SNARKJS_PROOF = {
  pi_a: ["1", "2", "3"],
  pi_b: [
    ["4", "5"],
    ["6", "7"],
    ["8", "9"],
  ],
  pi_c: ["10", "11", "12"],
};

const MOCK_PUBLIC_SIGNALS_8 = ["100", "200", "300", "400", "500", "600", "700", "800"];

// ============ CRYPTO / PRIMITIVES ============

describe("regression: crypto/primitives", () => {
  it("createDeriveFn produces deterministic output for DepositNullifierV1", () => {
    const derive = createDeriveFn("shinobi.cash:DepositNullifierV1");
    const result = derive(TEST_ACCOUNT_KEY, TEST_POOL, TEST_CHAIN_ID, TEST_DEPOSIT_INDEX);
    expect(result).toBeTypeOf("bigint");
    expect(result).toBeGreaterThan(0n);
    // Snapshot the value — must remain stable after ox migration
    expect(result.toString()).toMatchInlineSnapshot(`"6417162653045390202264337890678750733401491468966345146663814828579530092824"`);
  });

  it("createDeriveFn produces deterministic output for DepositSecretV1", () => {
    const derive = createDeriveFn("shinobi.cash:DepositSecretV1");
    const result = derive(TEST_ACCOUNT_KEY, TEST_POOL, TEST_CHAIN_ID, TEST_DEPOSIT_INDEX);
    expect(result).toBeTypeOf("bigint");
    expect(result.toString()).toMatchInlineSnapshot(`"6492575679609266804640809611436911549149417603152092425881983136455889890841"`);
  });

  it("createDeriveFn with changeIndex produces deterministic output", () => {
    const derive = createDeriveFn("shinobi.cash:ChangeNullifierV1");
    const result = derive(TEST_ACCOUNT_KEY, TEST_POOL, TEST_CHAIN_ID, TEST_DEPOSIT_INDEX, TEST_CHANGE_INDEX);
    expect(result).toBeTypeOf("bigint");
    expect(result.toString()).toMatchInlineSnapshot(`"16101572740084665092460373882605629258890114746155324389139296675213269780524"`);
  });

  it("derivePrecommitment is deterministic", () => {
    const nullifier = 123456789n;
    const secret = 987654321n;
    const result = derivePrecommitment(nullifier, secret);
    expect(result).toBeTypeOf("bigint");
    expect(result.toString()).toMatchInlineSnapshot(`"16832421271961222550979173996485995711342823810308835997146707681980704453417"`);
  });
});

// ============ DEPOSIT DERIVATION ============

describe("regression: deposit derivation", () => {
  it("deriveDepositNullifier is deterministic", () => {
    const result = deriveDepositNullifier(TEST_ACCOUNT_KEY, TEST_POOL, TEST_CHAIN_ID, TEST_DEPOSIT_INDEX);
    expect(result.toString()).toMatchInlineSnapshot(`"6417162653045390202264337890678750733401491468966345146663814828579530092824"`);
  });

  it("deriveDepositSecret is deterministic", () => {
    const result = deriveDepositSecret(TEST_ACCOUNT_KEY, TEST_POOL, TEST_CHAIN_ID, TEST_DEPOSIT_INDEX);
    expect(result.toString()).toMatchInlineSnapshot(`"6492575679609266804640809611436911549149417603152092425881983136455889890841"`);
  });
});

// ============ AUTH ============

describe("regression: auth", () => {
  it("parseUserKey with hex string", () => {
    const result = parseUserKey("0x1234567890abcdef");
    expect(result).toBe(BigInt("0x1234567890abcdef"));
  });

  it("parseUserKey with bigint", () => {
    const result = parseUserKey(42n);
    expect(result).toBe(42n);
  });

  it("generateKeysFromRandomSeed produces deterministic keys", () => {
    const result = generateKeysFromRandomSeed(TEST_SEED);
    expect(result.privateKey).toBe(TEST_SEED);
    expect(result.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(result.publicKey).toBeDefined();
    // Snapshot deterministic outputs
    expect(result.address).toMatchInlineSnapshot(`"0xFCAd0B19bB29D4674531d6f115237E16AfCE377c"`);
    expect(result.publicKey).toMatchInlineSnapshot(`"0x044646ae5047316b4230d0086c8acec687f00b1cd9d1dc634f6cb358ac0a9a8ffffe77b4dd0a4bfb95851f3b7355c781dd60f8418fc8a65d14907aff47c903a559"`);
  });

  it("getWalletAccountId is deterministic", () => {
    const result = getWalletAccountId(TEST_RECIPIENT, TEST_CHAIN_ID);
    expect(result).toMatchInlineSnapshot(`"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:chain-421614"`);
  });
});

// ============ WITHDRAWAL ENCODING ============

describe("regression: withdrawal encoding", () => {
  it("createWithdrawalData encodes correctly", () => {
    const [processooor, data] = createWithdrawalData(TEST_RECIPIENT, TEST_FEE_RECIPIENT, 500n);
    expect(processooor).toMatch(/^0x/);
    expect(data).toMatch(/^0x/);
    expect(data).toMatchInlineSnapshot(`"0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb00000000000000000000000000000000000000000000000000000000000001f4"`);
  });

  it("createCrossChainWithdrawalData encodes correctly", () => {
    const [processooor, data] = createCrossChainWithdrawalData(
      TEST_RECIPIENT,
      84532, // Base Sepolia
      TEST_FEE_RECIPIENT,
      300n
    );
    expect(processooor).toMatch(/^0x/);
    expect(data).toMatch(/^0x/);
    expect(data).toMatchInlineSnapshot(`"0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb000000000000000000000000000000000000000000000000000000000000012c00014a340000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"`);
  });

  it("calculateContextHash is deterministic", () => {
    const [processooor, data] = createWithdrawalData(TEST_RECIPIENT, TEST_FEE_RECIPIENT, 500n);
    const hash = calculateContextHash(1n, [processooor, data]);
    expect(hash).toBeDefined();
    expect(hash).toMatchInlineSnapshot(`"18107120547601484244946207560178878039461005703381100006614469800586155513091"`);
  });

  it("formatProofForContract structures correctly", () => {
    const result = formatProofForContract(MOCK_SNARKJS_PROOF, MOCK_PUBLIC_SIGNALS_8);
    expect(result.pA).toEqual([1n, 2n]);
    expect(result.pB).toEqual([[5n, 4n], [7n, 6n]]);
    expect(result.pC).toEqual([10n, 11n]);
    expect(result.pubSignals).toEqual([100n, 200n, 300n, 400n, 500n, 600n, 700n, 800n]);
  });

  it("encodeRelayCallData produces valid calldata", () => {
    const [processooor, data] = createWithdrawalData(TEST_RECIPIENT, TEST_FEE_RECIPIENT, 500n);
    const proof = formatProofForContract(MOCK_SNARKJS_PROOF, MOCK_PUBLIC_SIGNALS_8);
    const calldata = encodeRelayCallData({ processooor, data }, proof, 1n);
    expect(calldata).toMatch(/^0x/);
    // Verify function selector is stable (first 4 bytes)
    expect(calldata.slice(0, 10)).toMatchInlineSnapshot(`"0x8a44121e"`);
  });

  it("encodeRagequitCallData produces valid calldata", () => {
    const ragequitProof = {
      pA: [1n, 2n] as [bigint, bigint],
      pB: [[5n, 4n], [7n, 6n]] as [[bigint, bigint], [bigint, bigint]],
      pC: [10n, 11n] as [bigint, bigint],
      pubSignals: [100n, 200n, 300n, 400n] as [bigint, bigint, bigint, bigint],
    };
    const calldata = encodeRagequitCallData(ragequitProof);
    expect(calldata).toMatch(/^0x/);
    expect(calldata.slice(0, 10)).toMatchInlineSnapshot(`"0x71235b34"`);
  });
});

// ============ DERIVATION FUNCTIONS ============

describe("regression: change/refund derivation", () => {
  it("deriveChangeNullifier is deterministic", () => {
    const result = deriveChangeNullifier(TEST_ACCOUNT_KEY, TEST_POOL, TEST_CHAIN_ID, TEST_DEPOSIT_INDEX, TEST_CHANGE_INDEX);
    expect(result.toString()).toMatchInlineSnapshot(`"16101572740084665092460373882605629258890114746155324389139296675213269780524"`);
  });

  it("deriveChangeSecret is deterministic", () => {
    const result = deriveChangeSecret(TEST_ACCOUNT_KEY, TEST_POOL, TEST_CHAIN_ID, TEST_DEPOSIT_INDEX, TEST_CHANGE_INDEX);
    expect(result.toString()).toMatchInlineSnapshot(`"6600103167520686444030277653132369994500086733044625944139908015648868836088"`);
  });

  it("deriveRefundNullifier is deterministic", () => {
    const result = deriveRefundNullifier(TEST_ACCOUNT_KEY, TEST_POOL, TEST_CHAIN_ID, TEST_DEPOSIT_INDEX, TEST_CHANGE_INDEX);
    expect(result.toString()).toMatchInlineSnapshot(`"13043934301692330466553467277792063010833088036364823908157725870578209402874"`);
  });

  it("deriveRefundSecret is deterministic", () => {
    const result = deriveRefundSecret(TEST_ACCOUNT_KEY, TEST_POOL, TEST_CHAIN_ID, TEST_DEPOSIT_INDEX, TEST_CHANGE_INDEX);
    expect(result.toString()).toMatchInlineSnapshot(`"16318662437564850295066054947169458947026524483225157789878861615488826799158"`);
  });
});
