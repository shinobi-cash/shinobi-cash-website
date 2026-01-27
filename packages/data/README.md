# @shinobi-cash/data

Data access layer for Shinobi Cash indexer. Provides type-safe, fluent API for querying the GraphQL indexer.

## Installation

```bash
npm install @shinobi-cash/data
# or
pnpm add @shinobi-cash/data
```

## Quick Start

```typescript
import { IndexerClient } from '@shinobi-cash/data';

// Create client
const client = new IndexerClient({
  endpoint: 'https://your-indexer-url/graphql',
  headers: {
    'Authorization': 'Bearer your-token' // optional
  }
});

// Query activities
const activities = await client.getActivities({
  poolId: '0x5543b250b8a44513BA91C0346BeE40890FfD7D18',
  limit: 100,
  orderDirection: 'desc'
});

console.log(activities.items);
console.log(activities.pageInfo.hasNextPage);
```

## Features

### Fluent Query Builder

```typescript
// Query with builder pattern
const deposits = await client
  .query()
  .activities()
  .byPool(poolId)
  .onlyDeposits()
  .afterTimestamp(Date.now() - 86400000)
  .orderByTimestamp('desc')
  .limit(50)
  .execute();

// Get state tree leaves for ZK proofs
const leaves = await client
  .query()
  .stateTree()
  .byPool(poolId)
  .orderByLeafIndex('asc')
  .limit(10000)
  .execute();

// Get latest ASP approval root
const aspRoot = await client.getLatestASPRoot();
```

### Pagination

The SDK uses **offset-based pagination**:

```typescript
// First page
const firstPage = await client.getActivities({
  poolId,
  limit: 100,
  offset: 0
});

// Next page
if (firstPage.pageInfo.hasNextPage) {
  const nextPage = await client.getActivities({
    poolId,
    limit: 100,
    offset: 100
  });
}

// Fetch all pages
let offset = 0;
let hasNext = true;
const allItems = [];

while (hasNext) {
  const result = await client.getActivities({
    poolId,
    limit: 1000,
    offset
  });

  allItems.push(...result.items);
  hasNext = result.pageInfo.hasNextPage;
  offset += result.items.length;
}
```

### Convenience Methods

```typescript
// Get all state tree leaves (auto-paginates)
const leaves = await client.getAllStateTreeLeaves(poolId);

// Get pool statistics
const pool = await client.getPoolStats(poolId);

// Get latest ASP root
const aspRoot = await client.getLatestASPRoot();

// Health check
const health = await client.healthCheck();
```

### Type Safety

Full TypeScript support with typed activity variants:

```typescript
import {
  Activity,
  DepositActivity,
  WithdrawalActivity,
  isDepositActivity,
  isWithdrawalActivity
} from '@shinobi-cash/data';

// Type guards
if (isDepositActivity(activity)) {
  console.log(activity.commitment);
  console.log(activity.label);
}

if (isWithdrawalActivity(activity)) {
  console.log(activity.spentNullifier);
  console.log(activity.recipient);
}
```

### Serialization

Convert BigInt fields to strings for JSON serialization:

```typescript
import {
  convertBigIntsToStrings,
  convertStringsToBigInts,
  serializeActivity,
  deserializeActivity
} from '@shinobi-cash/data';

// Serialize for API response
const serialized = convertBigIntsToStrings(activities);

// Deserialize from API
const deserialized = convertStringsToBigInts(serialized);
```

### Global Client Pattern

For React apps and other contexts:

```typescript
import {
  IndexerClient,
  setShinobiClient,
  getShinobiClient,
  hasShinobiClient
} from '@shinobi-cash/data';

// Set up once in app initialization
const client = new IndexerClient({ endpoint: '...' });
setShinobiClient(client);

// Use anywhere in app
if (hasShinobiClient()) {
  const client = getShinobiClient();
  const activities = await client.getActivities({ poolId });
}
```

## API Reference

### IndexerClient

| Method | Description |
|--------|-------------|
| `getActivities(options)` | Get paginated activities for a pool |
| `getAllStateTreeLeaves(poolId)` | Get all merkle tree leaves (auto-paginates) |
| `getLatestASPRoot()` | Get latest ASP approval root |
| `getPoolStats(poolId)` | Get pool statistics |
| `healthCheck()` | Check indexer health |
| `query()` | Get fluent query builder |
| `executeQuery(query, variables)` | Execute raw GraphQL query |

### Types

| Type | Description |
|------|-------------|
| `Activity` | Union of all activity types |
| `DepositActivity` | Deposit-specific activity |
| `WithdrawalActivity` | Withdrawal-specific activity |
| `Pool` | Pool configuration and statistics |
| `StateTreeLeaf` | Merkle tree leaf |
| `ASPApprovalList` | ASP approval root info |
| `PageInfo` | Pagination metadata |
| `PaginatedResponse<T>` | Paginated query response |

## Compatibility

This SDK is compatible with the Shinobi Cash indexer which uses:
- Offset-based pagination
- Event-sourcing architecture
- SQL views for derived state
