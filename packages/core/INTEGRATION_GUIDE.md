# Shinobi Cash Core SDK — Integration Guide

A complete guide for integrating the **Shinobi Cash Core SDK** into your application.

---

## Table of Contents

* [Overview](#overview)
* [Architecture](#architecture)
* [Core Concepts](#core-concepts)
* [Integration Steps](#integration-steps)
* [API Reference](#api-reference)
* [Complete Example](#complete-example)
* [Best Practices](#best-practices)
* [Troubleshooting](#troubleshooting)
* [Migration from Old Implementation](#migration-from-old-implementation)

---

## Overview

The **Shinobi Cash Core SDK** provides **framework-agnostic primitives** for building privacy-preserving applications on top of Shinobi Cash.

It is intentionally **UI-, storage-, and network-agnostic**.

### What the SDK Provides

* **Note Discovery** — deterministic discovery and tracking of deposits and withdrawals
* **Cryptography** — key derivation, nullifiers, secrets, commitments
* **Zero-Knowledge Proofs** — withdrawal and cross-chain withdrawal proof generation
* **State Management** — explicit, pure state transitions for predictable sync behavior

### What the SDK Does *Not* Do

* No storage (IndexedDB, localStorage, SQL, etc.)
* No networking (you bring your own indexer / API)
* No UI or framework assumptions

---

## Design Philosophy

The SDK follows two strict architectural principles:

### 1. Pure Functions by Default

* Most exports are **pure, deterministic functions**
* No hidden state
* No side effects
* Easy to test, replay, and reason about

### 2. Primitives + Orchestration

* **Core SDK** provides *primitives*
* **Your app** handles orchestration, persistence, and UX

```ts
// ✅ Core SDK exports pure primitives
import { deriveDepositNullifier, buildNoteChain } from '@shinobi-cash/core';

// ✅ Core SDK exports stateful classes only where necessary
import { NoteSyncEngine, WithdrawalProofGenerator } from '@shinobi-cash/core';
```

> **Rule of thumb:**
> If an operation is cheap and deterministic → function
> If it is expensive or stateful → class

---

## Architecture

### Layered Model

```
┌─────────────────────────────────────────┐
│            Your Application             │
│  UI · Storage · Network · Business Logic│
├─────────────────────────────────────────┤
│        @shinobi-cash/core SDK            │
│  Crypto · Discovery · ZK Proofs          │
├─────────────────────────────────────────┤
│         External Dependencies            │
│  poseidon · snarkjs · viem      │
└─────────────────────────────────────────┘
```

The Core SDK **never**:

* fetches data
* stores data
* mutates global state

---

### Note Discovery Flow

```
1. Create NoteSyncEngine
   ↓
2. Load cached state (via your persistence callbacks)
   ↓
3. Fetch activity pages (via your fetcher)
   ↓
4. For each page:
   - Apply pure state transition (applyActivityPage)
   - Persist state (via callback)
   ↓
5. Return final discovery result
```

---

## Core Concepts

### 1. Note Chain

A **NoteChain** represents the complete lifecycle of a single deposit.

```ts
import type { NoteChain, DepositNote, ChangeNote } from '@shinobi-cash/core';

const chain: NoteChain = [
  {
    noteType: 'deposit',
    depositIndex: 0,
    changeIndex: 0,
    amount: '1000000000000000000',
    status: 'spent',
    precommitmentHash: '123456789...',
  },
  {
    noteType: 'change',
    depositIndex: 0,
    changeIndex: 1,
    amount: '700000000000000000',
    status: 'unspent',
  },
];
```

#### Invariants (Enforced by Types)

* First note is always a `DepositNote`
* `DepositNote.changeIndex === 0`
* Change and refund notes always reference a deposit
* Impossible states are unrepresentable

Use provided type guards:

```ts
isDepositNote(note)
isChangeNote(note)
isRefundNote(note)
```

---

### 2. Discovery State

Discovery uses an **explicit, serializable state object**.

```ts
import type { DiscoveryState } from '@shinobi-cash/core';

const state: DiscoveryState = {
  notes: [],
  nextDepositIndex: 0,
  liveDeposits: [],
  cursor: undefined,
  newDepositsFound: 0,
};
```

Why this matters:

* Crash-resilient sync
* Time-travel debugging
* Easy unit testing
* Worker / background-thread friendly

---

### 3. Discovery Policy

All discovery behavior is parameterized.

```ts
import {
  DEFAULT_DISCOVERY_POLICY,
  type DiscoveryPolicy,
} from '@shinobi-cash/core';

const policy: DiscoveryPolicy = {
  maxDepositScan: 100,
  pageSize: 100,
  persistEveryPages: 1,
};
```

No magic numbers.
No hidden constants.

---

### 4. Hash Representation (Important)

**All hashes are decimal strings.**

```ts
import {
  toHashString,
  fromHashString,
  type CommitmentHash,
} from '@shinobi-cash/core';

const hash: CommitmentHash = "12345678901234567890";

// ❌ Hex strings are not supported
const wrong = "0xabc123";
```

Conversions:

```ts
const str = toHashString(bigint);
const bi = fromHashString(str);
```

This avoids:

* bigint/hex ambiguity
* inconsistent indexer formats
* subtle equality bugs

---

## Integration Steps

### Step 1: Install Dependencies

```bash
npm install @shinobi-cash/core @shinobi-cash/data
```

---

### Step 2: Implement Activity Fetcher

You must provide a function that fetches activities **in ascending order**.

```ts
import type { ActivityFetcher } from '@shinobi-cash/core';

const activityFetcher: ActivityFetcher = async (
  poolAddress,
  limit,
  cursor,
  orderDirection = 'asc'
) => {
  const res = await fetch(
    `/api/activities?pool=${poolAddress}&limit=${limit}&cursor=${cursor}&order=${orderDirection}`
  );

  const data = await res.json();

  return {
    items: data.activities,
    pageInfo: {
      hasNextPage: data.hasNextPage,
      endCursor: data.cursor,
    },
  };
};
```

---

### Step 3: Implement Persistence Callbacks

You control storage. The SDK only calls you.

```ts
import type {
  PersistenceCallbacks,
  DiscoveryState,
} from '@shinobi-cash/core';

const persistence: PersistenceCallbacks = {
  loadState: async (publicKey, poolAddress) => {
    return yourStorage.load(publicKey, poolAddress);
  },

  saveState: async (publicKey, poolAddress, state) => {
    await yourStorage.save(publicKey, poolAddress, state);
  },
};
```

---

### Step 4: Use NoteSyncEngine (Recommended)

```ts
import { NoteSyncEngine } from '@shinobi-cash/core';

const engine = new NoteSyncEngine(activityFetcher, persistence);

const result = await engine.sync(
  publicKey,
  poolAddress,
  accountKey,
  {
    onProgress: console.log,
    signal: abortSignal,
  }
);
```

> **Most applications should use `NoteSyncEngine`.**
> Only use lower-level primitives for custom flows or testing.

---

## API Reference

### NoteSyncEngine

```ts
class NoteSyncEngine {
  constructor(
    fetcher: ActivityFetcher,
    persistence: PersistenceCallbacks
  );

  sync(
    publicKey: string,
    poolAddress: string,
    accountKey: bigint,
    options?: DiscoveryOptions
  ): Promise<DiscoveryResult>;
}
```

**Options:**

```ts
interface DiscoveryOptions {
  onProgress?: (progress: DiscoveryProgress) => void;
  maxPages?: number;
  pageSize?: number;
  signal?: AbortSignal;
}
```

**Returns:**

```ts
interface DiscoveryResult {
  notes: NoteChain[];
  lastUsedIndex: number;
  newNotesFound: number;
  lastProcessedCursor?: string;
}
```

---

### State Primitives (Advanced)

For custom flows or testing only.

```ts
import {
  initializeDiscoveryState,
  applyActivityPage,
  type DiscoveryState,
  DEFAULT_DISCOVERY_POLICY,
} from '@shinobi-cash/core';

// Initialize
let state = initializeDiscoveryState(notes, lastUsedIndex, cursor);

// Apply page (pure function)
state = applyActivityPage(
  state,
  activities,
  accountKey,
  poolAddress,
  DEFAULT_DISCOVERY_POLICY,
  newCursor
);
```

---

### Crypto Primitives

```ts
import {
  deriveDepositNullifier,
  deriveDepositSecret,
  deriveChangeNullifier,
  deriveChangeSecret,
  derivePrecommitment,
  derivedNoteCommitment,
} from '@shinobi-cash/core';

// Deposit credentials
const depositNullifier = deriveDepositNullifier(accountKey, poolAddress, depositIndex);
const depositSecret = deriveDepositSecret(accountKey, poolAddress, depositIndex);
const precommitment = derivePrecommitment(depositNullifier, depositSecret);

// Change credentials
const changeNullifier = deriveChangeNullifier(accountKey, poolAddress, depositIndex, changeIndex);
const changeSecret = deriveChangeSecret(accountKey, poolAddress, depositIndex, changeIndex);
const commitment = derivedNoteCommitment(changeNullifier, changeSecret, amount);
```

Pure. Deterministic. Circuit-compatible.

---

### Note Discovery Primitives (Advanced)

```ts
import {
  buildNoteChain,
  extendNoteChain,
  buildActivityIndexMaps,
  type ActivityContext,
} from '@shinobi-cash/core';

// Build index for O(1) lookups
const context: ActivityContext = buildActivityIndexMaps(activities);

// Build chain for new deposit
const chain = buildNoteChain(
  depositActivity,
  depositIndex,
  accountKey,
  poolAddress,
  activitiesAfterDeposit,
  context  // optional but recommended
);

// Extend existing chain
const extended = extendNoteChain(
  existingChain,
  newActivities,
  accountKey,
  poolAddress,
  context  // optional but recommended
);
```

---

## Complete Example

Real-world integration from the Shinobi Cash app:

```typescript
// File: NotesRepository.ts
import {
  NoteSyncEngine,
  type DiscoveryResult,
  type DiscoveryOptions,
  type DiscoveryState,
  type ActivityFetcher,
  type NoteChain,
} from '@shinobi-cash/core';

export class NotesRepository {
  async discoverNotes(
    publicKey: string,
    poolAddress: string,
    accountKey: bigint,
    fetchActivities: ActivityFetcher,
    options?: DiscoveryOptions,
  ): Promise<DiscoveryResult> {
    const engine = new NoteSyncEngine(fetchActivities, {
      loadState: async (pubKey, pool) => {
        const cached = await this.getCachedNotes(pubKey, pool);
        if (!cached) return null;

        return {
          notes: cached.notes,
          lastUsedIndex: cached.lastUsedIndex,
          cursor: cached.lastProcessedCursor,
        };
      },

      saveState: async (pubKey, pool, state) => {
        await this.storeDiscoveredNotes(
          pubKey,
          pool,
          state.notes,
          state.cursor,
        );
      },
    });

    return await engine.sync(publicKey, poolAddress, accountKey, options);
  }

  private async getCachedNotes(publicKey: string, poolAddress: string) {
    // Your storage implementation
  }

  private async storeDiscoveredNotes(
    publicKey: string,
    poolAddress: string,
    notes: NoteChain[],
    cursor?: string
  ) {
    // Your storage implementation
  }
}
```

```typescript
// File: NoteDiscoveryService.ts
import { storageManager } from '@/lib/storage';
import { fetchActivities } from '@/services/indexer';
import type { DiscoveryResult, DiscoveryOptions } from '@shinobi-cash/core';

export async function discoverNotes(
  publicKey: string,
  poolAddress: string,
  accountKey: bigint,
  options?: DiscoveryOptions
): Promise<DiscoveryResult> {
  return storageManager.discoverNotes(
    publicKey,
    poolAddress,
    accountKey,
    async (poolAddress, limit, cursor, orderDirection) => {
      const result = await fetchActivities(poolAddress, limit, cursor, orderDirection);
      return {
        items: result.items,
        pageInfo: result.pageInfo,
      };
    },
    options
  );
}
```

```typescript
// File: useNoteDiscovery.ts (React hook)
import { useState, useCallback } from 'react';
import { discoverNotes } from '@/services/noteDiscovery';
import type { DiscoveryResult, DiscoveryProgress } from '@shinobi-cash/core';

export function useNoteDiscovery() {
  const [progress, setProgress] = useState<DiscoveryProgress | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const discover = useCallback(async (
    publicKey: string,
    poolAddress: string,
    accountKey: bigint
  ): Promise<DiscoveryResult> => {
    setIsDiscovering(true);

    try {
      return await discoverNotes(publicKey, poolAddress, accountKey, {
        onProgress: setProgress,
      });
    } finally {
      setIsDiscovering(false);
    }
  }, []);

  return { discover, progress, isDiscovering };
}
```

---

## Best Practices

### ✔ Use Type Guards for Note Types

```ts
import { isDepositNote, isChangeNote, isRefundNote } from '@shinobi-cash/core';

for (const note of chain) {
  if (isDepositNote(note)) {
    console.log(note.precommitmentHash);
  } else if (isChangeNote(note)) {
    console.log(note.changeIndex);
  } else if (isRefundNote(note)) {
    console.log(note.refundCommitment);
  }
}
```

### ✔ Persist Every Page

Crash resilience > write optimization.

```ts
const policy: DiscoveryPolicy = {
  maxDepositScan: 100,
  pageSize: 100,
  persistEveryPages: 1,  // ✅ Default
};
```

### ✔ Use Activity Context for Performance

Build once, reuse everywhere:

```ts
import { buildActivityIndexMaps, extendNoteChain } from '@shinobi-cash/core';

const context = buildActivityIndexMaps(activities);

for (const chain of liveDeposits) {
  const extended = extendNoteChain(chain, activities, accountKey, poolAddress, context);
}
```

### ✔ Handle Abort Signals

Discovery can be long-running:

```ts
const abortController = new AbortController();

const promise = discoverNotes(publicKey, poolAddress, accountKey, {
  signal: abortController.signal,
});

// Cancel if needed
abortController.abort();

try {
  await promise;
} catch (error) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    console.log('Discovery cancelled');
  }
}
```

### ✔ Use Dev Utilities (Development Only)

```ts
import { dev } from '@shinobi-cash/core';

// Zero-cost in production
dev.log('[App] Processing notes:', notes.length);
dev.assert(notes.length > 0, 'Expected at least one note');

// Immutability checks
const frozen = dev.freeze(chain);
```

### ✔ Initialize Sync Baseline for New Accounts

Avoid scanning historical data:

```ts
// After account creation
const result = await fetchActivities(poolAddress, 1, undefined, 'desc');
const currentCursor = result.pageInfo.endCursor;

await storage.storeDiscoveredNotes(
  publicKey,
  poolAddress,
  [],
  currentCursor
);
```

---

## Indexer Requirements (Mandatory)

Your indexer **must** provide:

```ts
interface Activity {
  type: 'DEPOSIT' | 'CROSSCHAIN_DEPOSIT' | 'WITHDRAWAL' | 'CROSSCHAIN_WITHDRAWAL';
  precommitmentHash?: string;  // ✅ REQUIRED for deposits
  nullifierHash?: string;      // ✅ REQUIRED for withdrawals
}
```

Without these fields:

* Discovery fails fast with clear errors
* O(1) performance is impossible
* Scanning becomes O(n×k)

---

## Troubleshooting

### "Module has no exported member"

**Problem:** TypeScript can't find exports.

**Solution:**
```bash
cd packages/core
npm run build
```

### "precommitmentHash is required"

**Problem:** Indexer not providing precommitmentHash.

**Solution:** Update indexer to compute and return it:
```ts
const precommitmentHash = derivePrecommitment(nullifier, secret).toString();
```

### Discovery not finding notes

**Checklist:**
1. Is `lastUsedIndex` correct?
2. Are activities ordered ascending?
3. Does `precommitmentHash` match exactly (decimal string)?
4. Are there gaps in deposit indices?

### Memory issues with large histories

**Solution:** Reduce page size:
```ts
const result = await discoverNotes(publicKey, poolAddress, accountKey, {
  pageSize: 50,
  maxPages: 20,
});
```

---

## Migration from Old Implementation

If migrating from manual discovery:

1. **Remove manual orchestration** — delete loops and state tracking
2. **Implement callbacks** — wrap storage in PersistenceCallbacks
3. **Create fetcher** — wrap indexer calls in ActivityFetcher
4. **Replace with NoteSyncEngine** — single method call
5. **Test thoroughly** — verify same results

**Expected benefits:**
* ~300 lines removed
* O(n+k) instead of O(n×k)
* Built-in crash resilience
* Easier testing and maintenance

---

## Final Notes

* The Core SDK is intentionally strict
* Fail-fast behavior is by design
* Determinism > convenience

If something is unclear or seems overly restrictive, it's likely intentional. Open an issue to discuss.

---

**Last Updated:** 2025-01-28
**SDK Version:** 0.0.2
