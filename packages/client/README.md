# @shinobi-cash/client

Composable client for Shinobi Cash privacy pool interactions — deposits, withdrawals, cross-chain operations, and ZK proof generation.

## Installation

```bash
pnpm add @shinobi-cash/client
```

Peer dependencies:

```bash
pnpm add viem permissionless
```

## Quick Start

```ts
import { createShinobiAccount } from "@shinobi-cash/core/account";
import { createShinobiCashClient, withDeposit, withWithdrawal } from "@shinobi-cash/client";
import type { ShinobiIndexer } from "@shinobi-cash/client";
import { createBundlerRelayer } from "@shinobi-cash/client/relayer";

// Minimal setup: account (keys), indexer (read-only state), relayer (gas sponsorship)

// Create an account from a private key
const account = createShinobiAccount({
  credential: { type: "privateKey", privateKey: "0x..." },
});

// Implement the indexer interface against your backend
const indexer: ShinobiIndexer = {
  getStateTree: (poolAddress) => fetch(`${INDEXER_URL}/state-tree/${poolAddress}`).then((r) => r.json()),
  getASPRootInfo: () => fetch(`${INDEXER_URL}/asp-root`).then((r) => r.json()),
  getActivities: (accountId, poolAddress) => fetch(`${INDEXER_URL}/activities/${accountId}`).then((r) => r.json()),
};

// Use the built-in bundler relayer or implement your own ShinobiRelayer
const relayer = createBundlerRelayer({ url: "https://api.pimlico.io/v2/..." });

const client = createShinobiCashClient({ account, indexer })
  .extend(withDeposit())
  .extend(withWithdrawal(relayer));

// Sync notes from the indexer
await client.sync();

// Check balance
const balance = client.getBalance();

// Deposit
const call = client.prepareDeposit({ amountWei: 1000000000000000n });
const txHash = await client.deposit(call, walletClient);

// Withdraw
const notes = client.getSpendableNotes();
const prepared = await client.prepareWithdrawal({
  note: notes[0],
  amountWei: notes[0].amount,
  recipient: "0x...",
});
const withdrawTxHash = await client.submitWithdrawal(prepared);
```

## Architecture

The client uses a composable `.extend()` pattern — start with a base client and add only the capabilities you need:

```
createShinobiCashClient()          Base: sync, balance, chain utils
  .extend(withDeposit())           + same-chain deposit, ragequit
  .extend(withCrosschainDeposit()) + cross-chain deposit, deposit refund
  .extend(withWithdrawal())        + same-chain withdrawal
  .extend(withCrosschainWithdrawal()) + cross-chain withdrawal, refund
```

Each extension is a factory that returns methods scoped to its domain. Extensions share internal context (account, pool address, on-chain state) but expose independent APIs.

## API Reference

### Base Client

```ts
import { createShinobiCashClient } from "@shinobi-cash/client";

const client = createShinobiCashClient({
  account,       // ShinobiAccount — handles key derivation and proof generation
  indexer,       // ShinobiIndexer — provides state tree, ASP root, and activity data
  publicClients, // optional — override default viem PublicClients per chain
  storage,       // optional — StorageLayer for persisting discovery state
  cachedState,   // optional — pre-loaded SerializableDiscoveryState (alternative to storage)
  ipfsGateways,  // optional — custom IPFS gateways for ASP proof resolution
});
```

| Method | Returns | Description |
|--------|---------|-------------|
| `sync(options?)` | `Promise<DiscoveryResult>` | Discover notes from the indexer and update local state |
| `getSpendableNotes()` | `SpendableNote[]` | Get all unspent notes available for withdrawal |
| `getBalance()` | `bigint` | Sum of all spendable note amounts (wei) |
| `getActivities()` | `ActivityItem[]` | Get deposit/withdrawal activity history |
| `estimateGas(params, chainId)` | `Promise<bigint>` | Estimate gas for a transaction |
| `getGasPrice(chainId)` | `Promise<bigint>` | Get current gas price for a chain |
| `waitForTransaction(txHash, chainId)` | `Promise<{ status }>` | Wait for transaction confirmation |
| `extend(fn)` | `this & T` | Add extension methods to the client |

### Deposit

```ts
import { withDeposit } from "@shinobi-cash/client/deposit";

const client = baseClient.extend(withDeposit());
```

| Method | Returns | Description |
|--------|---------|-------------|
| `quoteDeposit({ amountWei })` | `DepositFeeQuote` | Get fee breakdown for a same-chain deposit |
| `prepareDeposit({ amountWei })` | `Call` | Encode the deposit transaction |
| `deposit(call, walletClient)` | `Promise<0x${string}>` | Send the deposit transaction, returns tx hash |
| `prepareRagequit({ note })` | `Promise<Call>` | Encode a ragequit (emergency withdrawal without proof) |
| `ragequit(call, walletClient)` | `Promise<0x${string}>` | Send the ragequit transaction |

### Cross-chain Deposit

```ts
import { withCrosschainDeposit } from "@shinobi-cash/client/crosschain-deposit";

const client = baseClient.extend(withCrosschainDeposit(solver));
```

Requires a `ShinobiSolver` for cross-chain quote resolution.

| Method | Returns | Description |
|--------|---------|-------------|
| `quoteCrosschainDeposit({ amountWei, solverFeeBPS? })` | `DepositFeeQuote` | Get fee breakdown including solver fees |
| `prepareCrosschainDeposit({ amountWei, chainId, settings?, useDefaults? })` | `Call` | Encode the cross-chain deposit |
| `prepareDepositRefund({ rawIntent, settlerAddress })` | `Call` | Encode a deposit refund if a cross-chain intent expires unfilled |
| `depositRefund(call, walletClient)` | `Promise<0x${string}>` | Send the deposit refund transaction |
| `getSolverQuote(params)` | `Promise<SolverQuote>` | Get a quote from the solver |

### Withdrawal

```ts
import { withWithdrawal } from "@shinobi-cash/client/withdrawal";

const client = baseClient.extend(withWithdrawal(relayer));
```

Requires a `ShinobiRelayer` for gasless withdrawal submission via ERC-4337.

`prepare*` methods generate ZK proofs and encode intents locally (heavy). `submit*` methods only submit already-prepared operations to the relayer (cheap).

| Method | Returns | Description |
|--------|---------|-------------|
| `quoteWithdrawal({ amountWei })` | `Promise<WithdrawalFeeQuote>` | Get fee breakdown for single-note withdrawal |
| `quoteWithdraw2({ amountWei })` | `Promise<WithdrawalFeeQuote>` | Get fee breakdown for two-note withdrawal |
| `prepareWithdrawal({ note, amountWei, recipient })` | `Promise<PreparedWithdrawalOp>` | Generate ZK proof and encode withdrawal |
| `prepareWithdraw2({ primaryNote, secondaryNote, amountWei, recipient, labelSelector? })` | `Promise<PreparedWithdrawalOp>` | Generate ZK proofs for two-note withdrawal |
| `submitWithdrawal(prepared)` | `Promise<0x${string}>` | Submit via relayer, returns tx hash |

### Cross-chain Withdrawal

```ts
import { withCrosschainWithdrawal } from "@shinobi-cash/client/crosschain-withdrawal";

const client = baseClient.extend(withCrosschainWithdrawal(relayer, solver));
```

Requires both a `ShinobiRelayer` and a `ShinobiSolver`.

| Method | Returns | Description |
|--------|---------|-------------|
| `quoteCrosschainWithdrawal({ amountWei, destinationChainId })` | `Promise<WithdrawalFeeQuote>` | Fee breakdown including relay + solver fees |
| `quoteCrosschainWithdraw2({ amountWei, destinationChainId })` | `Promise<WithdrawalFeeQuote>` | Fee breakdown for two-note cross-chain withdrawal |
| `prepareCrosschainWithdrawal({ note, amountWei, recipient, destinationChainId })` | `Promise<PreparedWithdrawalOp>` | Generate ZK proof and encode cross-chain withdrawal |
| `prepareCrosschainWithdraw2({ primaryNote, secondaryNote, amountWei, recipient, destinationChainId, labelSelector? })` | `Promise<PreparedWithdrawalOp>` | Two-note cross-chain withdrawal |
| `submitWithdrawal(prepared)` | `Promise<0x${string}>` | Submit via relayer |
| `prepareWithdrawalRefund({ rawIntent, settlerAddress })` | `Call` | Encode a withdrawal refund if a cross-chain intent expires unfilled |
| `submitWithdrawalRefund(call)` | `Promise<0x${string}>` | Submit refund via relayer |
| `getSolverQuote(params)` | `Promise<SolverQuote>` | Get a quote from the solver |

### Relayer

```ts
import { createBundlerRelayer } from "@shinobi-cash/client/relayer";

const relayer = createBundlerRelayer({ url: "https://api.pimlico.io/v2/..." });
```

Creates a `ShinobiRelayer` backed by ERC-4337 smart accounts. Works with any bundler URL. Handles UserOp construction, gas estimation, paymaster selection, and receipt tracking.

## Provider Interfaces

The client is provider-agnostic — `ShinobiIndexer`, `ShinobiRelayer`, and `ShinobiSolver` are interfaces you implement to connect your own backend services. A bundler-based relayer is provided out of the box.

### ShinobiIndexer

Provides on-chain state to the client. Pass to `createShinobiCashClient()`.

```ts
import type { ShinobiIndexer } from "@shinobi-cash/client";

interface ShinobiIndexer {
  getStateTree(poolAddress: string): Promise<{ leaves: { commitment: string }[] }>;
  getASPRootInfo(): Promise<{ aspRoot: string; ipfsCid: string } | null>;
  getActivities: ActivityFetcher;
  // ActivityFetcher = (poolAddress, limit, offset?, orderDirection?) => Promise<ActivityPage>
  // ActivityPage = { items: ActivityItem[]; pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean } }
}

const indexer: ShinobiIndexer = {
  async getStateTree(poolAddress) {
    const res = await fetch(`${INDEXER_URL}/state-tree/${poolAddress}`);
    return res.json();
  },

  async getASPRootInfo() {
    const res = await fetch(`${INDEXER_URL}/asp-root`);
    return res.json();
  },

  async getActivities(poolAddress, limit, offset, orderDirection) {
    const res = await fetch(`${INDEXER_URL}/activities?pool=${poolAddress}&limit=${limit}`);
    return res.json();
  },
};
```

### ShinobiRelayer

A `ShinobiRelayer` is a transaction submission adapter — not a protocol-operated relay service. The default implementation uses ERC-4337 bundlers + paymasters for gasless withdrawals. Pass to `withWithdrawal()` or `withCrosschainWithdrawal()`.

The package ships `createBundlerRelayer()` out of the box, but you can provide your own:

```ts
import type { ShinobiRelayer, RelayOperationType } from "@shinobi-cash/client";
import type { Call } from "@shinobi-cash/core/account";
import type { TransactionReceipt } from "viem";

type RelayOperationType = "withdraw" | "withdraw-crosschain" | "withdraw2" | "withdraw2-crosschain" | "refund";

interface ShinobiRelayer {
  getRelayAddress(type: RelayOperationType): `0x${string}`;
  quoteRelayFee(params: { type: RelayOperationType; amountWei: bigint }): Promise<{ relayFeeBPS: number }>;
  sendTransaction(params: { call: Call; type: RelayOperationType }): Promise<string>;
  waitForReceipt(txId: string): Promise<TransactionReceipt>;
}

const relayer: ShinobiRelayer = {
  getRelayAddress(type) {
    return PAYMASTER_ADDRESSES[type];
  },

  async quoteRelayFee({ type, amountWei }) {
    // Calculate based on gas cost vs withdrawal amount
    return { relayFeeBPS: 50 }; // e.g. 0.5%
  },

  async sendTransaction({ call, type }) {
    // Submit via bundler, backend relay, etc.
    return txId;
  },

  async waitForReceipt(txId) {
    // Poll or subscribe for the receipt
    return receipt;
  },
};
```

### ShinobiSolver

Provides cross-chain quotes. Pass to `withCrosschainDeposit()` or `withCrosschainWithdrawal()`.

```ts
import type { ShinobiSolver, SolverQuoteRequest, SolverQuote } from "@shinobi-cash/client";

interface SolverQuoteRequest {
  originChainId: number;
  destinationChainId: number;
  amountWei: string;
  type: "deposit" | "withdrawal";
}

interface SolverQuote {
  solverFeeBPS: number;
  fillDeadlineSeconds: number;
  expirySeconds: number;
  maxSolverFeeBPS: number;
}

interface ShinobiSolver {
  getQuote(params: SolverQuoteRequest): Promise<SolverQuote>;
}

const solver: ShinobiSolver = {
  async getQuote({ originChainId, destinationChainId, amountWei, type }) {
    const res = await fetch(`${SOLVER_URL}/quote`, {
      method: "POST",
      body: JSON.stringify({ originChainId, destinationChainId, amountWei, type }),
    });
    return res.json();
  },
};
```

## Types

Key interfaces exported from `@shinobi-cash/client`:

| Type | Description |
|------|-------------|
| `ShinobiCashClientConfig` | Config for `createShinobiCashClient()` |
| `BaseShinobiCashClient` | Base client interface (sync, balance, chain utils, extend) |
| `ShinobiCashClient` | Full client — base + all extensions |
| `ShinobiIndexer` | Indexer interface (state tree, ASP root, activities) |
| `ShinobiRelayer` | Relayer interface (fee quotes, transaction submission, receipts) |
| `ShinobiSolver` | Solver interface (cross-chain quotes) |
| `SolverQuote` | Quote response from solver |
| `PreparedWithdrawalOp` | Opaque prepared withdrawal — pass to `submitWithdrawal()` |
| `DepositActions` | Methods added by `withDeposit()` |
| `CrosschainDepositActions` | Methods added by `withCrosschainDeposit()` |
| `WithdrawalActions` | Methods added by `withWithdrawal()` |
| `CrosschainWithdrawalActions` | Methods added by `withCrosschainWithdrawal()` |
| `StorageLayer` | Persistence interface for discovery state |
| `SerializableDiscoveryState` | Serializable snapshot of discovery state |
