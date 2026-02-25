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
    ├── DepositController (checks isAuthenticated)
    ├── WithdrawController (checks isAuthenticated)
    └── NotesDiscoveryController (checks isAuthenticated)
              ↑
              ├── DepositController (gets lastUsedIndex)
              └── All controllers call refresh() after transactions
```

### 1. AuthController

**File**: `src/controllers/AuthController.ts`

**Purpose**: Authentication and session management.

**State Shape**:
```typescript
interface AuthControllerState {
  state: AuthState;
}

type AuthState =
  | { status: "booting" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; session: AuthSession }
  | { status: "error"; error: AppError };

type AuthSession = {
  accountId: string;
  authenticatedAt: number;
  passkeyEnabled: boolean;
};
```

**State Transitions**:
```
booting → unauthenticated (no session)
booting → authenticated (passkey auto-login)
unauthenticated → authenticated (wallet sign-in)
authenticated → unauthenticated (logout)
```

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `bootstrap()` | Restore session on app load |
| `signInWithWallet({walletAddress, chainId, signature})` | Wallet authentication |
| `enablePasskey()` | Enable passwordless login (two biometric prompts) |
| `removePasskey()` | Disable passkey |
| `logout()` | Clear session |
| `isAuthenticated()` | Guard for downstream operations |

**Critical Invariant**: `isAuthenticated()` is the gate for all downstream operations. RuntimeBootstrap reacts to `state.status === "authenticated"` transitions.

---

### 2. NotesDiscoveryController

**File**: `src/controllers/NotesDiscoveryController.ts`

**Purpose**: Privacy note discovery and caching.

**State Shape**:
```typescript
interface NotesDiscoveryControllerState {
  state: DiscoveryState;
  noteTrees: NoteTree[];
  activities: ActivityItem[];
  progress: DiscoveryProgress | null;
  lastError: NotesError | null;
  lastSyncedAt: number | null;
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
idle → ready (cache loaded)
discovering → ready (success)
discovering → error (failure)
ready → discovering (refresh)
error → discovering (retry)
```

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `bootstrap()` | Load cache, trigger discovery (fire-and-forget) |
| `discover()` | Full discovery via `getShinobiClient().sync()` |
| `refresh()` | Debounced re-discovery (500ms) |
| `reset()` | Clear all state |

**Sync triggers** (no background polling):
1. On authentication (`bootstrap()` via AppRuntime)
2. After transactions (controllers call `refresh()`)
3. Manual user trigger (NotesSyncIndicator button)

**Selectors** (`NotesDiscoverySelectors`):
| Selector | Returns |
|----------|---------|
| `getNoteTrees()` | All note trees |
| `getSpendableNotes()` | Notes available for balance display |
| `getWithdrawableNotes()` | ASP-approved notes for private withdrawal |
| `getCounts()` | `{ spendable, pending, spent }` |
| `getLastUsedIndex(chainId?)` | Highest deposit index for a chain |
| `getViewState()` | UI-friendly status with sync error handling |

**Concurrency**: Uses `discoveryId` counter and `abortController` to prevent race conditions.

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
  solverFeeBPS: number;
  fillDeadlineSeconds: number;
  expirySeconds: number;
  contractDefaults: SolverQuote | null;
}

type DepositState =
  | { status: "idle" }
  | { status: "preparing"; step: "commitment" | "gas" }
  | { status: "ready"; amounts: DepositAmounts; gasEstimate: GasEstimate; txRequest: TransactionRequest }
  | { status: "submitting" }
  | { status: "confirming"; txHash: `0x${string}` }
  | { status: "confirmed"; txHash: `0x${string}` }
  | { status: "failed"; txHash: `0x${string}`; reason: string }
  | { status: "error"; error: AppError };
```

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `setAmount(amount)` | Update deposit amount |
| `schedulePrepare(delay)` | Debounced prepare (1s default) |
| `prepare()` | Generate commitment via `getShinobiAccount().deposit()`, estimate gas |
| `submit()` | Submit transaction via wallet |
| `reset()` | Clear all state |
| `setSolverFeeBPS(bps)` | Configure cross-chain solver fee |

**Selectors** (`DepositSelectors`):
| Selector | Returns |
|----------|---------|
| `canDeposit()` | status === "ready" |
| `canAutoPrepare()` | Valid inputs + connected + authenticated |
| `isCrossChain()` | chainId !== POOL_CHAIN.id |
| `isAboveMinimum()` | Amount meets minimum threshold |

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
  selectedNotes: Note[];
  selection: WithdrawalSelection | null;
  previewFeeQuote: WithdrawalFeeQuote | null;
  lastError: AppError | null;
  notes: NotesContext;
  solverFeeBPS: number;
  fillDeadlineSeconds: number;
  expirySeconds: number;
}

type WithdrawState =
  | { status: "idle" }
  | { status: "previewing" }
  | { status: "preparing" }
  | { status: "ready"; prepared: PreparedWithdrawalOp }
  | { status: "submitting" }
  | { status: "confirmed"; txHash: `0x${string}` }
  | { status: "error"; error: AppError };
```

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `setAmount(amount)` | Update withdrawal amount |
| `setRecipientAddress(address)` | Set destination address |
| `selectNote(note)` | Select single note (replaces selection) |
| `addNote(note)` | Add note to selection (max 2 for Withdraw2) |
| `removeNote(note)` | Remove note from selection |
| `setMax()` | Set amount to total selected notes balance |
| `schedulePreview(delay)` | Debounced fee quote (500ms) |
| `preview()` | Get fee quote via `client.quoteWithdrawal()` |
| `prepare()` | Full pipeline via `client.prepareWithdrawal()` (proof + UserOp) |
| `confirm()` | prepare() + submit() |
| `submit()` | Submit via `client.submitWithdrawal()` (bundler) |

**Selectors** (`WithdrawSelectors`):
| Selector | Returns |
|----------|---------|
| `canWithdraw()` | Valid inputs + authenticated |
| `isCrossChain()` | destination !== pool chain |
| `getNetAmount()` | Amount after fees |
| `isWithdraw2()` | `selection.type === "withdraw2"` |
| `getTotalInputAmount()` | Sum of selected notes |
| `getWithdrawalMode()` | `"standard"` or `"withdraw2"` |

**Note Selection & Routing**:
- `selectNotesForWithdrawal()` from `@shinobi-cash/core/withdrawal` determines routing
- 1 note → standard withdrawal via `client.prepareWithdrawal()`
- 2 notes → Withdraw2 merge via `client.prepareWithdraw2()`
- `WithdrawalSelection` carries primary/secondary inputs + label selector

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

## SDK Architecture

### Package Boundaries

```
ShinobiAccount (@shinobi-cash/core/account)
  = Pure crypto encoder (closure pattern)
  = deposit(), prepareWithdrawal(), prepareWithdraw2(), ragequit()
  = No I/O, no state, no pool config

ShinobiCashClient (@shinobi-cash/client)
  = Chain interaction layer
  = sync(), prepareWithdrawal(), submitWithdrawal(), quoteWithdrawal()
  = Wraps account with bundler (Pimlico), indexer, contract reads
```

### Singletons

**AccountSingleton** (`src/runtime/AccountSingleton.ts`):
```typescript
createAccount(privateKey)  // Called in AppRuntime.onAuthenticated()
getShinobiAccount()        // Used by DepositController, RagequitController
destroyAccount()           // Called in _teardown()
```

**ClientSingleton** (`src/runtime/ClientSingleton.ts`):
```typescript
createClient(account)      // Called in AppRuntime.onAuthenticated()
getShinobiClient()         // Used by WithdrawController, NotesDiscoveryController
destroyClient()            // Called in _teardown()
```

---

## Services Layer

Services are stateless singletons for external operations.

### 1. AccountService

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
| `deriveDataEncryptionKey(masterKey)` | DEK for note encryption |
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
├── MasterKeyRepository
└── SessionRepository

Tier 3: IndexedDB Database
├── encrypted-notes
├── account-metadata
└── wrapped-master-key
```

### Encryption Architecture

**Envelope Encryption Pattern**:
```
Wallet Signature → HKDF → KEK (Key Encryption Key)
                            ↓
                    Encrypts Master Key (MK) in IndexedDB
                            ↓
Master Key (MK) → HKDF → DEK (Data Encryption Key)
                                    ↓
                            Encrypts notes in IndexedDB
```

**Key Properties**:
- DEK and KEK are non-extractable (stay in browser crypto context)
- Multiple auth methods (wallet + passkey) each have their own KEK
- Both KEKs encrypt the same Master Key

### Storage Key Patterns

| Store | Key Pattern | Value |
|-------|-------------|-------|
| `encrypted-notes` | `SHA256(publicKey + poolAddress)` | Encrypted note cache |
| `account-metadata` | `{accountId}` | AccountMetadata (plaintext) |
| `wrapped-master-key` | `{accountId}:mk:wallet\|passkey` | Encrypted Master Key |
| SessionStorage | `shinobi_session` | SessionInfo |

---

## Runtime Orchestration

### AppRuntime Lifecycle

**File**: `src/runtime/AppRuntime.ts`

**Two Phases**:
```
Phase 1: AppRuntime.start()
  └── AuthController.bootstrap() → Restore session (passkey or wallet)

Phase 2: AppRuntime.onAuthenticated() (triggered by RuntimeBootstrap)
  ├── createAccount(privateKey) → ShinobiAccount singleton
  ├── createClient(account) → ShinobiCashClient singleton
  └── NotesDiscoveryController.bootstrap() (fire-and-forget)
      ├── Load cached notes from IndexedDB
      └── Trigger discovery via client.sync()
```

**Teardown** (`_teardown()`): `reset discovery → destroy client → destroy account`

### RuntimeBootstrap (React Bridge)

**File**: `src/context/RuntimeBootstrap.tsx`

**Purpose**: Bridge React lifecycle to AppRuntime.

```typescript
export function RuntimeBootstrap() {
  const authState = useSnapshot(AuthController.state);
  const isAuthenticated = authState.state.status === "authenticated";
  const prevAuthenticated = useRef(isAuthenticated);

  // Start runtime on mount
  useEffect(() => {
    AppRuntime.start();
    return () => AppRuntime.stop();
  }, []);

  // React to auth state changes
  useEffect(() => {
    if (!prev && isAuthenticated) AppRuntime.onAuthenticated();
    if (prev && !isAuthenticated) AppRuntime.onLogout();
  }, [isAuthenticated]);

  return null;
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
│   └── state = "authenticated"
├── If passkey fails → toast + state = "unauthenticated"
└── If no session → state = "unauthenticated"
       ↓
RuntimeBootstrap detects isAuthenticated transition
       ↓
AppRuntime.onAuthenticated()
├── createAccount(privateKey) → ShinobiAccount
├── createClient(account) → ShinobiCashClient
└── NotesDiscoveryController.bootstrap() (fire-and-forget)
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
├── deriveWalletCredentials(signature, chainId, walletAddress)
│   └── HKDF → accountId + privateKey
├── deriveKEKFromWallet(signature, chainId, walletAddress) → KEK
├── accountService.createWalletAccount() or loginWithWalletKEK()
├── storeSessionInfo(accountId)
└── state = "authenticated" (triggers onAuthenticated via RuntimeBootstrap)
```

### Deposit Flow

```
User enters amount
       ↓
DepositController.schedulePrepare() (debounced 1s)
       ↓
DepositController.prepare()
├── status = "preparing"
├── getShinobiAccount().deposit() → TransactionRequest
├── Estimate gas
├── Calculate fees (1% compliance + solver for cross-chain)
└── status = "ready"
       ↓
User clicks "Confirm Deposit"
       ↓
DepositController.submit()
├── status = "submitting"
├── wallet.sendTransaction(txRequest)
├── status = "confirming" (wait for receipt)
├── status = "confirmed"
└── NotesDiscoveryController.refresh()
```

### Withdrawal Flow

```
User selects note + enters amount + recipient
       ↓
WithdrawController.schedulePreview() (debounced 500ms)
       ↓
WithdrawController.preview()
├── client.quoteWithdrawal() → Fee quote for display
└── previewFeeQuote updated
       ↓
User clicks "Confirm Withdrawal"
       ↓
WithdrawController.confirm() → prepare() + submit()
       ↓
WithdrawController.prepare()
├── client.prepareWithdrawal() or client.prepareWithdraw2()
│   ├── Fetch pool scope, state tree, ASP labels, gas prices
│   ├── account.prepareWithdrawal() → ZK proof (5-15s)
│   └── Build ERC-4337 UserOp via Pimlico
└── status = "ready" with PreparedWithdrawalOp
       ↓
WithdrawController.submit()
├── client.submitWithdrawal(prepared)
│   └── Submit UserOp via Pimlico bundler (gasless)
├── status = "confirmed"
└── NotesDiscoveryController.refresh()
```

### Note Discovery Flow

```
NotesDiscoveryController.bootstrap()
       ↓
Load cached notes from IndexedDB (instant UI)
       ↓
NotesDiscoveryController.discover()
       ↓
getShinobiClient().sync()
  └── NoteDiscovery.sync() (from @shinobi-cash/core)
      ├── Phase 1: Reconciliation
      │   └── Update known deposits with on-chain state
      ├── Phase 2: Live Deposit Extension
      │   └── Check for new change notes
      └── Phase 3: New Deposit Discovery
          └── Scan for unknown deposits via precommitment matching
       ↓
Update noteTrees + activities state
Store notes in encrypted IndexedDB (via persistence callbacks)
```

**No background polling** — syncs are explicit:
1. On authentication (`bootstrap()`)
2. After transactions (controllers call `refresh()`)
3. Manual user trigger (NotesSyncIndicator button)

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

### SDK Routing

The WithdrawController routes to the correct SDK method:
```typescript
// In prepare()
const prepared = isWithdraw2
  ? await client.prepareWithdraw2({ primaryNote, secondaryNote, ... })
  : await client.prepareWithdrawal({ note, ... });
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
| `@shinobi-cash/core` | Crypto primitives, note discovery, proof generation, ShinobiAccount |
| `@shinobi-cash/client` | Chain interaction layer (ShinobiCashClient, bundler, solver) |
| `@shinobi-cash/constants` | Chain configs, addresses, ABIs, fee constants |
| `@shinobi-cash/data` | IndexerClient with fluent query builder |
| `@workspace/ui` | Shared shadcn/ui components |

### SDK Highlights

- **ShinobiAccount** (`@shinobi-cash/core/account`): Pure crypto encoder, closure pattern. `deposit()`, `prepareWithdrawal()`, `ragequit()`. No I/O.
- **ShinobiCashClient** (`@shinobi-cash/client`): Chain interaction. `sync()`, `prepareWithdrawal()`, `submitWithdrawal()`, `quoteWithdrawal()`. Wraps account with bundler + indexer.
- **NoteDiscovery** (`@shinobi-cash/core/discovery`): Stateful discovery with `NoteDeriver` interface.
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
- **"No valid session"**: Check SessionStorage (tab-scoped, cleared on close)
- **Passkey fails**: Check device PRF support, credentialId matches
- **"Master Key unwrap failed"**: Check correct KEK being used

### Notes Issues
- **Notes not appearing**: Check discovery status, filter settings, try manual sync
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
| `src/controllers/RagequitController.ts` | Emergency exit (public withdrawal) |
| `src/runtime/AppRuntime.ts` | Lifecycle orchestration |
| `src/runtime/AccountSingleton.ts` | ShinobiAccount singleton |
| `src/runtime/ClientSingleton.ts` | ShinobiCashClient singleton |
| `src/context/RuntimeBootstrap.tsx` | React-AppRuntime bridge |
| `src/services/AccountService.ts` | Account lifecycle (KEK, MK, DEK) |
| `src/services/KeyDerivationService.ts` | Key derivation (HKDF, WebAuthn PRF) |
| `src/services/RefundEngine.ts` | Cross-chain withdrawal refund |
| `src/lib/storage/repositories/` | Storage repositories |
| `src/lib/storage/encryption.ts` | AES-GCM encryption for IndexedDB |
| `src/lib/errors/errors.ts` | Error handling |
| `src/components/shared/Timeline.tsx` | Shared timeline components |
| `src/components/indicators/NotesSyncIndicator.tsx` | Manual sync button |
| `src/utils/stateMachine.ts` | FSM with strict transition validation |
