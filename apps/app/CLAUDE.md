# CLAUDE.md - Shinobi Cash App

This file provides detailed guidance for working with the Shinobi Cash application codebase.

## Project Overview

Shinobi Cash is a privacy-focused cross-chain withdrawal application using zero-knowledge proofs and Privacy Pools. This is the main app within a Turborepo monorepo.

## Common Commands

```bash
# Development (from apps/app or monorepo root)
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm typecheck        # TypeScript checking
pnpm lint             # ESLint
pnpm lint:fix         # ESLint with auto-fix

# From monorepo root (recommended)
pnpm build            # Turbo handles package dependencies
```

---

## Architecture Overview

### Key Patterns

1. **Controller Pattern**: Business logic in Valtio-powered controllers (not React)
2. **Service Layer**: Stateless services for external operations (proofs, blockchain, storage)
3. **Repository Pattern**: Domain-specific storage abstractions over adapters
4. **State Machine**: Explicit state transitions with guards
5. **Reactive Bridge**: RuntimeBootstrap connects React lifecycle to controller state

### Directory Structure

```
src/
├── controllers/      # Valtio state machines (business logic)
├── services/         # Stateless services (crypto, proofs, accounts)
├── hooks/            # React adapters for controllers
├── components/       # UI components (presentational + containers)
├── lib/
│   ├── storage/      # IndexedDB, repositories, encryption
│   ├── clients/      # External API clients (Pimlico)
│   └── errors/       # Error types and utilities
├── runtime/          # AppRuntime lifecycle orchestration
├── context/          # React providers + RuntimeBootstrap bridge
├── utils/            # Pure utility functions
├── types/            # TypeScript type definitions
└── config/           # App configuration (chains, constants)
```

---

## Controller Architecture

Controllers own business logic and state using Valtio proxies. React components subscribe via `useSnapshot()`.

### Controller Dependency Graph

```
AuthController (root - no dependencies)
    ↑
    ├── DepositController (reads crypto)
    ├── WithdrawController (reads crypto)
    └── NotesDiscoveryController (reads crypto)
              ↑
              ├── ActivityDiscoveryController (derives from notes)
              ├── DepositController (gets lastUsedIndex)
              └── TransactionTrackingController (triggers refresh)
```

### 1. AuthController

**File**: `src/controllers/AuthController.ts`

**Purpose**: Authentication and cryptographic material management.

**State Shape**:
```typescript
interface AuthControllerState {
  state: AuthState;
  crypto: CryptoContext;
}

type AuthState =
  | { status: "booting" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; session: AuthSession }
  | { status: "error"; error: AppError };

interface CryptoContext {
  publicKey: string | null;
  accountKey: bigint | null;
  cryptoReady: boolean;  // TRUE = downstream can proceed
}
```

**State Transitions**:
```
booting → unauthenticated (no session)
booting → authenticated (passkey auto-login)
unauthenticated → authenticated (wallet sign-in)
authenticated → unauthenticated (logout)
any → error (critical failure)
```

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `bootstrap()` | Restore session on app load |
| `signInWithWallet({walletAddress, chainId, signature})` | Wallet authentication |
| `enablePasskey()` | Enable passwordless login |
| `removePasskey()` | Disable passkey |
| `logout()` | Clear session and crypto |

**Critical Invariant**: `cryptoReady` is the gate for all downstream operations.

---

### 2. NotesDiscoveryController

**File**: `src/controllers/NotesDiscoveryController.ts`

**Purpose**: Privacy note discovery and caching.

**State Shape**:
```typescript
interface NotesDiscoveryControllerState {
  state: DiscoveryState;
  noteChains: NoteChain[];
  progress: DiscoveryProgress | null;
  lastError: NotesError | null;
}

type DiscoveryState =
  | { status: "idle" }
  | { status: "discovering" }
  | { status: "ready" }
  | { status: "error"; error: NotesError };
```

**State Transitions**:
```
idle → discovering (bootstrap/discover called)
discovering → ready (success)
discovering → error (failure)
ready → discovering (refresh)
error → discovering (retry)
```

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `bootstrap()` | Load cache, trigger discovery |
| `discover()` | Full discovery from indexer |
| `refresh()` | Debounced re-discovery (500ms) |
| `startBackgroundSync(poolAddress)` | Spawn Web Worker for polling |
| `stopBackgroundSync()` | Terminate worker |
| `reset()` | Clear all state |

**Selectors**:
| Selector | Returns |
|----------|---------|
| `getNoteChains()` | All note chains |
| `getAvailableNotes()` | Withdrawable notes |
| `getCounts()` | `{ available, pending, spent }` |
| `getLastUsedIndex()` | For new deposit index |
| `getViewState()` | UI-friendly status |

**Concurrency**: Uses `discoveryId` counter and `abortController` to prevent race conditions.

**Withdraw2 Support**: Discovery handles `WITHDRAW2` activities with dual nullifiers (`spentNullifier` + `spentNullifier1`), marking both source notes as spent.

---

### 3. DepositController

**File**: `src/controllers/DepositController.ts`

**Purpose**: Deposit flow orchestration.

**State Shape**:
```typescript
interface DepositControllerState {
  state: DepositState;
  amount: string;
  lastPreparedAmounts: DepositAmounts | null;
  wallet: WalletContext;
}

type DepositState =
  | { status: "idle" }
  | { status: "preparing"; step: "crypto" | "commitment" | "gas" }
  | { status: "ready"; amounts: DepositAmounts; gasEstimate: GasEstimate; noteData: CashNoteData }
  | { status: "submitting" }
  | { status: "confirming"; txHash: `0x${string}` }
  | { status: "confirmed-onchain"; txHash: `0x${string}` }
  | { status: "indexed"; txHash: `0x${string}` }
  | { status: "failed"; txHash: `0x${string}`; reason: string }
  | { status: "error"; error: AppError };
```

**State Transitions**:
```
idle → preparing (auto-prepare triggers)
preparing → ready (commitment + gas done)
ready → submitting (user confirms)
submitting → confirming (tx submitted)
confirming → confirmed-onchain (receipt success)
confirmed-onchain → indexed (indexer synced)
```

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `setAmount(amount)` | Update deposit amount |
| `schedulePrepare(delay)` | Debounced prepare (1s default) |
| `prepare()` | Generate commitment, estimate gas |
| `submit()` | Submit transaction to chain |
| `markIndexed()` | Called when indexer confirms |
| `reset()` | Clear all state |

**Selectors**:
| Selector | Returns |
|----------|---------|
| `canDeposit()` | status === "ready" |
| `canAutoPrepare()` | Valid inputs + connected + crypto ready |
| `isCrossChain()` | chainId !== POOL_CHAIN.id |

---

### 4. WithdrawController

**File**: `src/controllers/WithdrawController.ts`

**Purpose**: Withdrawal with ZK proofs. Supports both 1:1 withdrawals and 2:1 Withdraw2 merges.

**State Shape**:
```typescript
interface WithdrawControllerState {
  state: WithdrawState;
  amount: string;
  recipientAddress: string;
  destinationChainId: number;
  selectedNote: Note | null;
  selectedNotes: Note[];             // For Withdraw2 (2 notes)
  previewFeeQuote: FeeQuote | null;
  lastError: AppError | null;
  notes: NotesContext;
}

type WithdrawState =
  | { status: "idle" }
  | { status: "previewing" }
  | { status: "preparing"; phase: EnginePhase }
  | { status: "ready"; preparedUserOp: PreparedUserOperation }
  | { status: "submitting" }
  | { status: "confirmed"; txHash; executionResult }
  | { status: "indexed"; txHash; executionResult }
  | { status: "error"; error: AppError };
```

**Prepare Phases** (during `preparing`):
```
quoted → context-built → witness-built → proof-generated → prepared
```

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `setAmount(amount)` | Update withdrawal amount |
| `setRecipientAddress(address)` | Set destination address |
| `selectNote(note)` | Select note to withdraw from |
| `setMax()` | Set amount to note balance |
| `schedulePreview(delay)` | Debounced fee quote (500ms) |
| `preview()` | Get fee quote only |
| `prepare()` | Full pipeline (proof generation) |
| `confirm()` | prepare() + submit() |
| `submit()` | Submit to bundler |

**Selectors**:
| Selector | Returns |
|----------|---------|
| `canWithdraw()` | Valid inputs + crypto ready |
| `isCrossChain()` | destination !== pool chain |
| `getNetAmount()` | Amount after fees |
| `isWithdraw2()` | selectedNotes.length === 2 |
| `getSelectedNotesTotal()` | Sum of selected notes balances |

**Withdraw2 Support**:
- **Multi-note selection**: `selectNote()` handles toggling notes in `selectedNotes[]`
- **Automatic routing**: Controller routes to Withdraw2Engine when 2 notes selected
- **Combined balance**: `getSelectedNotesTotal()` returns sum for max calculation

---

### 5. TransactionTrackingController

**File**: `src/controllers/TransactionTrackingController.ts`

**Purpose**: Monitor transaction lifecycle from submission to indexer confirmation.

**State Shape**:
```typescript
interface TransactionTrackingState {
  status: "idle" | "pending" | "waiting" | "synced" | "failed";
  transaction: { hash: string; chainId: number; blockNumber: number | null } | null;
}
```

**Flow**:
```
trackTransaction(txHash) → pending → waiting (receipt confirmed) → synced (indexed)
                                   ↓
                              failed (tx failed)
```

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `trackTransaction(txHash, chainId)` | Start tracking |
| `onTransactionIndexed(callback)` | Register callback for indexed event |
| `reset()` | Clear tracking |

---

### 6. Screen Controllers (UI State Only)

**NotesScreenController** (`src/controllers/NotesScreenController.ts`):
- `activeFilter`: "available" | "pending" | "spent"
- `selectedNoteChain`: NoteChain | null

**ActivityScreenController** (`src/controllers/ActivityScreenController.ts`):
- `activeFilter`: "all" | "deposit" | "withdrawal" | "refund"
- `selectedActivityId`: string | null

**ActivityDiscoveryController** (`src/controllers/ActivityDiscoveryController.ts`):
- Derives activities from note chains (passive, no fetching)

---

## Services Layer

Services are stateless singletons for external operations.

### 1. WithdrawalOrchestratorService (WithdrawalEngine & Withdraw2Engine)

**File**: `src/services/WithdrawalOrchestratorService.ts`

**Purpose**: Orchestrate the complete withdrawal pipeline. Two engine variants:
- **WithdrawalEngine**: 1:1 withdrawal (single note)
- **Withdraw2Engine**: 2:1 JoinSplit merge (two notes → one output + change)

**Engine Phases**:
```
idle → quoted → context-built → witness-built → proof-generated → prepared → executed
```

**Pipeline Steps**:

| Phase | Method | Description |
|-------|--------|-------------|
| 1 | `quoteFees(request)` | Calculate fees (gas + relay + solver) |
| 2 | `buildContext()` | Fetch pool scope, derive withdrawal inputs |
| 3 | `buildWitness()` | Fetch merkle trees (state + ASP) |
| 4 | `generateProof()` | ZK proof via snarkjs (5-15 seconds) |
| 5 | `prepareUserOperation()` | Build ERC-4337 UserOperation |
| 6 | `execute()` | Submit via Pimlico bundler |

**Usage**:
```typescript
const engine = new WithdrawalEngine();
const preparedUserOp = await engine.prepare(request);
const result = await engine.execute();
```

---

### 2. ProofGeneratorService

**File**: `src/services/ProofGeneratorService.ts`

**Purpose**: Browser-specific ZK proof generation with circuit loading.

**Circuit Files** (loaded from `/public/circuits/`):
```
# 1:1 Withdrawal (8 signals)
/circuits/build/withdraw/withdraw.wasm
/circuits/keys/withdraw.zkey
/circuits/keys/withdraw.vkey

# 1:1 Cross-chain Withdrawal (9 signals)
/circuits/build/crosschain_withdraw/crosschain_withdrawal.wasm
/circuits/keys/crosschain_withdrawal.zkey
/circuits/keys/crosschain_withdrawal.vkey

# 2:1 Withdraw2 Merge (9 signals)
/circuits/build/withdraw2/withdraw2.wasm
/circuits/keys/withdraw2.zkey
/circuits/keys/withdraw2.vkey

# 2:1 Cross-chain Withdraw2 Merge (10 signals)
/circuits/build/crosschain_withdraw2/crosschain_withdraw2.wasm
/circuits/keys/crosschain_withdraw2.zkey
/circuits/keys/crosschain_withdraw2.vkey
```

**Singleton**: `withdrawalProofGenerator`

---

### 3. AccountService

**File**: `src/services/AccountService.ts`

**Purpose**: Account lifecycle management.

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `createWalletAccount()` | New account setup |
| `loginWithWalletKEK()` | Wallet authentication |
| `loginWithPasskeyKEK()` | Passkey authentication |
| `initializeAccountSession()` | Derive DEK, setup encryption |
| `enablePasskeyForCurrentAccount()` | Add passkey unlock |
| `removePasskeyForCurrentAccount()` | Remove passkey |
| `clearInMemorySession()` | Logout cleanup |

**Singleton**: `accountService`

---

### 4. KeyDerivationService

**File**: `src/services/KeyDerivationService.ts`

**Purpose**: Cryptographic key derivation (HKDF, WebAuthn PRF).

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `deriveDataEncryptionKey(amkPrivateKey)` | DEK for note encryption |
| `deriveKEKFromPasskey(accountId, credentialId)` | KEK from WebAuthn PRF |
| `createPasskeyCredential(accountId, publicKeyHash)` | Register new passkey |

**Singleton**: `keyDerivationService`

---

## Storage Architecture

### Three-Tier Storage System

```
Tier 1: Browser APIs (Adapters)
├── IndexedDBStore (encrypted)
└── SessionStorageAdapter (plain)

Tier 2: Repositories (Domain Logic)
├── NotesRepository
├── AccountRepository
├── WrappedAMKRepository
└── SessionRepository

Tier 3: IndexedDB Database
├── encrypted-notes
├── account-metadata
└── wrapped-amk
```

### Encryption Architecture

**Envelope Encryption Pattern**:
```
Wallet Signature → HKDF → KEK (Key Encryption Key)
                            ↓
                    Encrypts AMK in IndexedDB
                            ↓
AMK (Account Master Key) → HKDF → DEK (Data Encryption Key)
                                    ↓
                            Encrypts notes in IndexedDB
```

**Key Properties**:
- DEK and KEK are non-extractable (stay in browser crypto context)
- Multiple auth methods (wallet + passkey) each have their own KEK
- Both KEKs encrypt the same AMK

### Storage Key Patterns

| Store | Key Pattern | Value |
|-------|-------------|-------|
| `encrypted-notes` | `SHA256(publicKey + poolAddress)` | Encrypted note cache |
| `account-metadata` | `{accountId}` | AccountMetadata (plaintext) |
| `wrapped-amk` | `{accountId}:amk:wallet\|passkey` | Encrypted AMK |
| SessionStorage | `shinobi_session` | SessionInfo |

---

## Runtime Orchestration

### AppRuntime Lifecycle

**File**: `src/runtime/AppRuntime.ts`

**Three Phases**:
```
Phase 1: AuthController.bootstrap()
  └── Restore session (passkey or wallet), derive crypto keys

Phase 2: NotesDiscoveryController.bootstrap() (if cryptoReady)
  ├── Load cached notes from IndexedDB
  └── Trigger background discovery

Phase 3: NotesDiscoveryController.startBackgroundSync()
  └── Spawn Web Worker for 60s polling
```

### RuntimeBootstrap (React Bridge)

**File**: `src/context/RuntimeBootstrap.tsx`

**Purpose**: Bridge React lifecycle to AppRuntime.

```typescript
export function RuntimeBootstrap() {
  const { cryptoReady } = useSnapshot(AuthController.state.crypto);
  const prevCryptoReady = useRef(cryptoReady);

  // Start runtime on mount
  useEffect(() => {
    AppRuntime.start();
    return () => AppRuntime.stop();
  }, []);

  // React to crypto state changes
  useEffect(() => {
    if (!prev && cryptoReady) AppRuntime.onCryptoReady();  // Login
    if (prev && !cryptoReady) AppRuntime.onLogout();       // Logout
  }, [cryptoReady]);

  return null;  // No visual output
}
```

### Provider Hierarchy

```
ErrorBoundary
  ↓
ThemeProvider
  ↓
SettingsProvider
  ↓
WagmiProvider
  ↓
QueryClientProvider
  ├── RuntimeBootstrap (invisible)
  └── {children}
```

---

## Detailed Flows

### Authentication Flow

```
User Opens App
       ↓
RuntimeBootstrap mounts → AppRuntime.start()
       ↓
AuthController.bootstrap()
├── Check SessionStorage for saved session
├── If credentialId exists → Passkey auto-login
│   ├── keyDerivationService.deriveKEKFromPasskey()
│   ├── accountService.loginWithPasskeyKEK()
│   └── Set crypto.cryptoReady = true
└── If no session → state.status = "unauthenticated"
       ↓
RuntimeBootstrap detects cryptoReady transition
       ↓
AppRuntime.onCryptoReady()
├── NotesDiscoveryController.bootstrap()
└── startBackgroundSync()
```

### Wallet Sign-In Flow

```
User clicks "Sign in with Wallet"
       ↓
WalletAuth Component
├── connectAsync({ connector }) → Get wallet address
├── switchChainAsync({ chainId: POOL_CHAIN_ID })
├── signTypedDataAsync(EIP-712 message)
└── AuthController.signInWithWallet({ walletAddress, chainId, signature })
       ↓
AuthController
├── deriveKeysFromSignature(signature, chainId, walletAddress)
│   └── HKDF → keyGenSeed + encryptionKey (KEK)
├── generateKeysFromWalletSignature() → { publicKey, privateKey }
├── accountService.createWalletAccount() or loginWithWalletKEK()
└── Set crypto = { publicKey, accountKey, cryptoReady: true }
```

### Deposit Flow

```
User enters amount
       ↓
DepositController.schedulePrepare() (debounced 1s)
       ↓
DepositController.prepare()
├── status = "preparing"
├── Generate commitment (nullifier, secret, precommitment)
├── Estimate gas
├── Calculate fees (1% compliance + 5% solver for cross-chain)
└── status = "ready"
       ↓
User clicks "Confirm Deposit"
       ↓
DepositController.submit()
├── status = "submitting"
├── Submit tx to contract
│   ├── Same-chain: SHINOBI_CASH_ENTRYPOINT.deposit(precommitment)
│   └── Cross-chain: Solver fills intent on pool chain
├── status = "confirming" (wait for receipt)
└── status = "confirmed-onchain"
       ↓
TransactionTrackingController.trackTransaction()
├── Poll indexer for block confirmation
└── Dispatch "indexed" event
       ↓
DepositController.markIndexed()
NotesDiscoveryController.refresh()
```

### Withdrawal Flow

```
User selects note + enters amount + recipient
       ↓
WithdrawController.schedulePreview() (debounced 500ms)
       ↓
WithdrawController.preview()
├── quoteFees() → Fee quote for display
└── previewFeeQuote updated
       ↓
User clicks "Confirm Withdrawal"
       ↓
WithdrawController.confirm() → prepare() + submit()
       ↓
WithdrawalEngine.prepare(request)
├── Phase 1: quoteFees() → Get fee quote
├── Phase 2: buildContext() → Fetch pool scope, derive inputs
├── Phase 3: buildWitness() → Fetch merkle trees from indexer
├── Phase 4: generateProof() → ZK proof via snarkjs (5-15s)
└── Phase 5: prepareUserOperation() → Build ERC-4337 UserOp
       ↓
WithdrawController.submit()
├── WithdrawalEngine.execute()
│   └── Submit via Pimlico bundler (gasless)
├── status = "confirmed"
└── Track transaction
       ↓
TransactionTrackingController
├── Wait for indexer
└── Dispatch "indexed" event
       ↓
WithdrawController.markIndexed()
NotesDiscoveryController.refresh()
```

### Note Discovery Flow

```
NotesDiscoveryController.bootstrap()
       ↓
Load cached notes from IndexedDB (instant UI)
       ↓
NotesDiscoveryController.discover()
       ↓
NoteDiscovery.sync() (from @shinobi-cash/core)
├── Phase 1: Reconciliation
│   └── Update known deposits with on-chain state
├── Phase 2: Live Deposit Extension
│   └── Check for new change notes
└── Phase 3: New Deposit Discovery
    └── Scan for unknown deposits via precommitment matching
       ↓
Store notes in encrypted IndexedDB
Update noteChains state
       ↓
Background Sync (Web Worker)
├── Poll every 60s
├── Fetch latest activities
└── Trigger refresh() on changes
```

---

## Fee Structure

### Deposit Fees

| Fee | Amount | When |
|-----|--------|------|
| Compliance Fee | 1% | Always |
| Solver Fee | 5% | Cross-chain only |
| Gas | Variable | Paid separately |

### Withdrawal Fees

| Fee | Amount | When |
|-----|--------|------|
| Relay Fee | Up to 15% (dynamic) | Covers gas |
| Solver Fee | 5% | Cross-chain only |

**Note**: Withdrawals use Account Abstraction (ERC-4337) - users don't need ETH for gas.

### Gas Limits

**1:1 Withdrawal (Standard)**:
| Component | Same-Chain | Cross-Chain |
|-----------|------------|-------------|
| Call Gas Limit | 550,000 | 687,500 |
| Verification Gas | 200,000 | 200,000 |
| Paymaster Verification | 400,000 | 500,000 |
| **Total** | ~1,350,000 | ~1,637,500 |

**2:1 Withdraw2 (Merge)**:
| Component | Same-Chain | Cross-Chain |
|-----------|------------|-------------|
| Call Gas Limit | 660,000 | 825,000 |
| Verification Gas | 200,000 | 200,000 |
| Paymaster Verification | 500,000 | 600,000 |
| **Total** | ~1,560,000 | ~1,875,000 |

---

## Withdraw2 (2:1 Merge Withdrawals)

### Overview

Withdraw2 enables merging two notes into a single withdrawal + change output. This is useful for:
- **Note Consolidation**: Combine fragmented small notes
- **Privacy Enhancement**: Single output instead of multiple withdrawals
- **Gas Efficiency**: One transaction instead of two

### Multi-Note Selection UI

**File**: `src/app/(authenticated)/withdraw/page.tsx`

The withdrawal page supports selecting up to 2 notes:
```typescript
// Toggle note selection
const toggleNote = (note: Note) => {
  WithdrawController.selectNote(note);  // Adds/removes from selectedNotes[]
};

// Display mode changes based on selection count
const isWithdraw2 = selectedNotes.length === 2;
```

### Engine Routing

The WithdrawController automatically routes to the correct engine:
```typescript
// In prepare()
const engine = selectedNotes.length === 2
  ? new Withdraw2Engine()  // 2:1 merge
  : new WithdrawalEngine(); // 1:1 standard
```

### Proof Structures

| Circuit | Signals | Description |
|---------|---------|-------------|
| withdraw2 | 9 | Same-chain 2:1 merge |
| crosschain_withdraw2 | 10 | Cross-chain 2:1 merge (includes refundCommitment) |

**Signal Layout (Withdraw2 - 9 signals)**:
```
[0] newCommitmentHash   - Change note commitment
[1] nullifierHash0      - First note nullifier
[2] nullifierHash1      - Second note nullifier
[3] withdrawnValue      - Amount withdrawn
[4] stateTreeRoot       - Merkle state root
[5] stateTreeDepth      - Tree depth
[6] aspRoot             - ASP approval root
[7] aspTreeDepth        - ASP tree depth
[8] context             - Withdrawal context hash
```

**Signal Layout (CrosschainWithdraw2 - 10 signals)**:
```
[0-8] Same as Withdraw2
[9] refundCommitment    - For failed cross-chain refund
```

### Chain Inheritance Rule

When merging notes from different deposit chains, the larger `depositIndex` determines which chain continues. This ensures consistent note lineage tracking.

---

## Note Types

**Discriminated unions from `@shinobi-cash/core`**:

```typescript
type Note = DepositNote | ChangeNote | RefundNote;

interface DepositNote {
  type: "deposit";
  depositIndex: number;
  changeIndex: 0;  // Always 0
  // ...
}

interface ChangeNote {
  type: "change";
  depositIndex: number;
  changeIndex: number;  // > 0
  // ...
}

interface RefundNote {
  type: "refund";
  // For failed cross-chain
}

type NoteChain = Note[];  // Full deposit history
```

### Note States

| State | Condition | Can Withdraw |
|-------|-----------|--------------|
| Available | unspent + activated + ASP approved | Yes |
| Pending (Cross-chain) | unspent + !activated + isCrossChain | No (waiting for solver) |
| Pending (ASP) | unspent + activated + ASP pending | No |
| Rejected | unspent + activated + ASP rejected | Only ragequit |
| Spent | spent | No |

---

## Error Handling

**File**: `src/lib/errors/errors.ts`

**Categories**:
| Category | Purpose |
|----------|---------|
| `AUTH` | Authentication errors |
| `BLOCKCHAIN` | Transaction errors |
| `NETWORK` | Network errors |
| `INDEXER` | Indexer errors |
| `DEPOSIT` | Deposit errors |
| `WITHDRAWAL` | Withdrawal errors |

**Usage**:
```typescript
Errors.auth.failed("Custom message", cause)
Errors.blockchain.userRejected(cause)
Errors.withdrawal.proofFailed(cause)
```

**Utilities**:
```typescript
isUserCancellation(error)  // Don't show toast
getUserMessage(error)      // User-friendly message
logError(error)            // Deduplicated logging
```

---

## Hook Patterns

### Controller-Hook Connection

```typescript
// Hook syncs external context to controller
export function useDepositController() {
  const snapshot = useSnapshot(DepositController.state);

  // Sync Wagmi state to controller
  useEffect(() => {
    DepositController._updateWallet({ isConnected, address, chainId, ... });
  }, [deps]);

  return snapshot;  // Read-only
}

// Component reads snapshot, calls controller methods
function DepositForm() {
  const state = useDepositController();
  const handleSubmit = () => DepositController.submit();
}
```

### Screen Navigation Pattern

```typescript
const screens = useScreenNavigation<"preview" | "timeline">();

if (screens.is("timeline")) return <TimelineScreen onClose={screens.close} />;
if (screens.is("preview")) return <PreviewScreen onConfirm={() => screens.navigate("timeline")} />;

return <MainForm onReview={() => screens.navigate("preview")} />;
```

---

## UI Component Architecture

### Component Directory Structure

```
src/components/
├── screens/          # Full-screen overlay components
├── shared/           # Reusable atomic UI components
├── layout/           # Layout wrappers (ScreenLayout)
├── auth/             # Authentication components
├── notes/            # Note-related components
├── activity/         # Activity feed components
└── indicators/       # Status indicators
```

### Screen Components (`components/screens/`)

Full-screen components used for multi-step flows. Each screen manages its own state presentation.

| Component | Purpose |
|-----------|---------|
| `DepositTimelineScreen` | Deposit transaction progress (3-step timeline) |
| `WithdrawalTimelineScreen` | Withdrawal transaction progress (3-step timeline) |
| `DepositPreviewScreen` | Review deposit details before confirmation |
| `WithdrawalPreviewScreen` | Review withdrawal details before confirmation |
| `NoteSelectionScreen` | Select note for withdrawal |
| `AssetChainSelectorScreen` | Select destination chain |
| `NoteChainScreen` | View note history chain |
| `ActivityDetailsScreen` | View activity details |
| `AuthScreen` | Authentication flow |

### Shared Components (`components/shared/`)

Atomic, reusable UI components for forms and displays.

| Component | Purpose |
|-----------|---------|
| `Timeline` | Shared timeline types, icons, and `TimelineSteps` component |
| `ScreenHeader` | Consistent header with back button and title |
| `CardContainer` | Styled card wrapper |
| `AmountInput` | Numeric input for amounts |
| `AmountDisplay` | Formatted amount display |
| `AmountUsd` | USD value display |
| `AssetPill` | Asset + chain badge |
| `AssetChain` | Chain icon and name |
| `PriceDisplay` | Current price display |
| `FeeBreakdown` | Fee breakdown table |
| `QuickAmountButtons` | 25%, 50%, Max buttons |
| `SectionDivider` | Visual divider between sections |
| `LabelWithHover` | Label with tooltip |

### Timeline Components

Shared timeline infrastructure in `components/shared/Timeline.tsx`:

```typescript
// Types
type StepStatus = "completed" | "active" | "pending" | "failed";

interface TimelineItem {
  label: string;
  status: StepStatus;
  description: string;
  errorMessage?: string;
  link?: { url: string; text: string };
  timestamp?: string;
  duration?: string;
}

interface StepTiming {
  startTime: Date;
  displayTime: string;
  duration?: string;
}

// Components
StepIcon        // Individual step status icon
StatusIcon      // Hero status icon (complete/error/pending)
TimelineSteps   // Full timeline rendering

// Utilities
formatDuration(startTime, endTime)  // "5s", "2m 30s"
```

### Timeline Screen Pattern

Both deposit and withdrawal timelines follow the same 3-step pattern:

```
1. Preparing   → Sign wallet / Generate ZK proof
2. Submitting  → Wait for on-chain confirmation (shows tx link)
3. Complete    → Success message (cross-chain aware)
```

Each step tracks:
- `timestamp`: When step started (formatted via `formatDateTime`)
- `duration`: Time taken to complete (formatted via `formatDuration`)
- `errorMessage`: Failure reason if step failed
- `link`: Explorer URL for transaction

### Layout Components (`components/layout/`)

| Component | Purpose |
|-----------|---------|
| `ScreenLayout` | Standard screen wrapper with header/footer slots |

```typescript
<ScreenLayout
  containerClassName="h-[600px]"
  header={<ScreenHeader title="Title" onBack={onBack} />}
  footer={<Button>Action</Button>}
  contentClassName="px-6 py-4"
>
  {children}
</ScreenLayout>
```

---

## Monorepo Packages

| Package | Purpose |
|---------|---------|
| `@shinobi-cash/core` | Crypto primitives, note discovery, proof generation |
| `@shinobi-cash/constants` | Chain configs, addresses, ABIs, fee constants |
| `@shinobi-cash/data` | IndexerClient with fluent query builder |
| `@workspace/ui` | Shared shadcn/ui components |

### Core SDK Highlights

- **Pure functions**: `deriveDepositNullifier()`, `derivePrecommitment()`, `parseUserKey()`
- **Classes (when needed)**: `WithdrawalProofGenerator`, `EncryptionService`, `NoteDiscovery`
- **Hash format**: Decimal strings (BigInt.toString()), never 0x-prefixed hex

---

## Environment Variables

```
NEXT_PUBLIC_PROJECT_ID=       # Reown/WalletConnect Project ID
NEXT_PUBLIC_PIMLICO_API_KEY=  # Pimlico smart account API
NEXT_PUBLIC_RP_ID=            # WebAuthn relying party (optional)
```

---

## Code Conventions

- **Package Manager**: pnpm@10.4.1 exclusively
- **TypeScript**: Strict mode enabled
- **Path Alias**: `@/*` maps to `./src/*`
- **Controllers**: Business logic with Valtio state
- **Hooks**: Thin adapters bridging React ↔ Controllers
- **Components**: Prefer pure presentational
- **Hash Format**: Decimal strings for Poseidon hashes

---

## Common Debugging

### Auth Issues
- **"No valid session"**: Check SessionStorage, session timeout (1 hour), environment mismatch
- **Passkey fails**: Check device PRF support, credentialId matches
- **"AMK unwrap failed"**: Check correct KEK being used

### Notes Issues
- **Notes not appearing**: Check discovery status, filter settings, background sync
- **Note stuck in pending**: Check isActivated, aspStatus, cross-chain solver
- **Cannot withdraw**: Check `canWithdraw(note)` conditions

### Transaction Issues
- **Stuck in pending**: Check network, transaction on explorer
- **Not indexed**: Check indexer health, poll interval
- **Proof generation slow**: Normal (5-15s), keep tab active

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/controllers/AuthController.ts` | Auth state machine |
| `src/controllers/DepositController.ts` | Deposit state machine |
| `src/controllers/WithdrawController.ts` | Withdrawal state machine |
| `src/controllers/NotesDiscoveryController.ts` | Notes discovery |
| `src/services/WithdrawalOrchestratorService.ts` | Withdrawal + Withdraw2 pipelines |
| `src/services/ProofGeneratorService.ts` | ZK proof generation |
| `src/services/AccountService.ts` | Account lifecycle |
| `src/services/KeyDerivationService.ts` | Key derivation |
| `src/runtime/AppRuntime.ts` | Lifecycle orchestration |
| `src/context/RuntimeBootstrap.tsx` | React-AppRuntime bridge |
| `src/lib/storage/repositories/` | Storage repositories |
| `src/lib/errors/errors.ts` | Error handling |
| `src/components/shared/Timeline.tsx` | Shared timeline components |
| `src/components/screens/DepositTimelineScreen.tsx` | Deposit progress UI |
| `src/components/screens/WithdrawalTimelineScreen.tsx` | Withdrawal progress UI |
| `src/components/layout/ScreenLayout.tsx` | Screen layout wrapper |
| `src/hooks/useScreenNavigation.ts` | Screen navigation hook |
| `src/utils/formatters.ts` | Formatting utilities |
