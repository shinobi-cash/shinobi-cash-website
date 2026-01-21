import { describe, it, expect } from 'vitest';
import {
  safeBigIntParse,
  convertBigIntsToStrings,
  convertStringsToBigInts,
  serializeActivity,
  deserializeActivity,
  serializePool,
  deserializePool,
  serializeStateTreeLeaf,
  deserializeStateTreeLeaf,
  serializeASPApprovalList,
  deserializeASPApprovalList,
} from './index.js';
import type { Activity, Pool, StateTreeLeaf, ASPApprovalList } from '../types/indexer.js';

describe('safeBigIntParse', () => {
  it('should return 0n for null', () => {
    expect(safeBigIntParse(null)).toBe(0n);
  });

  it('should return 0n for undefined', () => {
    expect(safeBigIntParse(undefined)).toBe(0n);
  });

  it('should return the same bigint for bigint input', () => {
    expect(safeBigIntParse(123n)).toBe(123n);
  });

  it('should convert number to bigint', () => {
    expect(safeBigIntParse(123)).toBe(123n);
  });

  it('should floor floating point numbers', () => {
    expect(safeBigIntParse(123.7)).toBe(123n);
  });

  it('should parse string to bigint', () => {
    expect(safeBigIntParse('123')).toBe(123n);
  });

  it('should parse large string numbers', () => {
    expect(safeBigIntParse('1000000000000000000')).toBe(1000000000000000000n);
  });

  it('should return 0n for invalid string', () => {
    expect(safeBigIntParse('invalid')).toBe(0n);
  });

  it('should return 0n for empty string', () => {
    expect(safeBigIntParse('')).toBe(0n);
  });
});

describe('convertBigIntsToStrings', () => {
  it('should convert bigint to string', () => {
    expect(convertBigIntsToStrings(123n)).toBe('123');
  });

  it('should handle null', () => {
    expect(convertBigIntsToStrings(null)).toBe(null);
  });

  it('should handle undefined', () => {
    expect(convertBigIntsToStrings(undefined)).toBe(undefined);
  });

  it('should pass through non-bigint primitives', () => {
    expect(convertBigIntsToStrings('hello')).toBe('hello');
    expect(convertBigIntsToStrings(123)).toBe(123);
    expect(convertBigIntsToStrings(true)).toBe(true);
  });

  it('should convert bigints in arrays', () => {
    const input = [1n, 2n, 3n];
    const result = convertBigIntsToStrings(input);
    expect(result).toEqual(['1', '2', '3']);
  });

  it('should convert bigints in objects', () => {
    const input = { amount: 100n, name: 'test' };
    const result = convertBigIntsToStrings(input);
    expect(result).toEqual({ amount: '100', name: 'test' });
  });

  it('should handle nested objects', () => {
    const input = {
      outer: {
        inner: {
          value: 999n,
        },
        name: 'nested',
      },
    };
    const result = convertBigIntsToStrings(input);
    expect(result).toEqual({
      outer: {
        inner: {
          value: '999',
        },
        name: 'nested',
      },
    });
  });

  it('should handle arrays of objects with bigints', () => {
    const input = [{ amount: 1n }, { amount: 2n }];
    const result = convertBigIntsToStrings(input);
    expect(result).toEqual([{ amount: '1' }, { amount: '2' }]);
  });
});

describe('convertStringsToBigInts', () => {
  it('should convert specified string fields to bigint', () => {
    const input = { amount: '100', name: 'test' };
    const result = convertStringsToBigInts(input, ['amount']);
    expect(result).toEqual({ amount: 100n, name: 'test' });
  });

  it('should convert specified number fields to bigint', () => {
    const input = { amount: 100, name: 'test' };
    const result = convertStringsToBigInts(input, ['amount']);
    expect(result).toEqual({ amount: 100n, name: 'test' });
  });

  it('should handle null', () => {
    expect(convertStringsToBigInts(null, ['amount'])).toBe(null);
  });

  it('should handle undefined', () => {
    expect(convertStringsToBigInts(undefined, ['amount'])).toBe(undefined);
  });

  it('should handle arrays', () => {
    const input = [{ amount: '100' }, { amount: '200' }];
    const result = convertStringsToBigInts(input, ['amount']);
    expect(result).toEqual([{ amount: 100n }, { amount: 200n }]);
  });

  it('should handle nested objects', () => {
    const input = {
      outer: {
        amount: '100',
      },
    };
    const result = convertStringsToBigInts(input, ['amount']);
    expect(result).toEqual({
      outer: {
        amount: 100n,
      },
    });
  });

  it('should not convert fields not in bigIntFields array', () => {
    const input = { amount: '100', count: '50' };
    const result = convertStringsToBigInts(input, ['amount']);
    expect(result).toEqual({ amount: 100n, count: '50' });
  });
});

describe('Activity serialization', () => {
  const mockActivity: Activity = {
    id: 'activity-1',
    type: 'DEPOSIT',
    status: 'pending',
    aspStatus: 'pending',
    poolId: '0x123',
    user: '0xuser',
    amount: 1000000000000000000n,
    commitment: '0xcommitment',
    blockNumber: 12345678n,
    timestamp: 1700000000n,
    originTransactionHash: '0xtxhash',
    originChainId: 42161n,
  };

  it('should serialize activity with bigint fields as strings', () => {
    const serialized = serializeActivity(mockActivity);

    expect(serialized.amount).toBe('1000000000000000000');
    expect(serialized.blockNumber).toBe('12345678');
    expect(serialized.timestamp).toBe('1700000000');
    expect(serialized.originChainId).toBe('42161');
    expect(serialized.id).toBe('activity-1');
    expect(serialized.type).toBe('DEPOSIT');
  });

  it('should deserialize activity with string fields as bigints', () => {
    const serialized = serializeActivity(mockActivity);
    const deserialized = deserializeActivity(serialized);

    expect(deserialized.amount).toBe(1000000000000000000n);
    expect(deserialized.blockNumber).toBe(12345678n);
    expect(deserialized.timestamp).toBe(1700000000n);
    expect(deserialized.originChainId).toBe(42161n);
    expect(deserialized.id).toBe('activity-1');
  });

  it('should handle round-trip serialization', () => {
    const serialized = serializeActivity(mockActivity);
    const deserialized = deserializeActivity(serialized);

    expect(deserialized.id).toBe(mockActivity.id);
    expect(deserialized.type).toBe(mockActivity.type);
    expect(deserialized.amount).toBe(mockActivity.amount);
    expect(deserialized.blockNumber).toBe(mockActivity.blockNumber);
    expect(deserialized.timestamp).toBe(mockActivity.timestamp);
  });
});

describe('Pool serialization', () => {
  const mockPool: Pool = {
    id: '0xpool',
    totalDeposits: 10000000000000000000n,
    totalWithdrawals: 5000000000000000000n,
    depositCount: 100n,
    createdAt: 1700000000n,
  };

  it('should serialize pool with bigint fields as strings', () => {
    const serialized = serializePool(mockPool);

    expect(serialized.totalDeposits).toBe('10000000000000000000');
    expect(serialized.totalWithdrawals).toBe('5000000000000000000');
    expect(serialized.depositCount).toBe('100');
    expect(serialized.createdAt).toBe('1700000000');
    expect(serialized.id).toBe('0xpool');
  });

  it('should deserialize pool with string fields as bigints', () => {
    const serialized = serializePool(mockPool);
    const deserialized = deserializePool(serialized);

    expect(deserialized.totalDeposits).toBe(10000000000000000000n);
    expect(deserialized.totalWithdrawals).toBe(5000000000000000000n);
    expect(deserialized.depositCount).toBe(100n);
    expect(deserialized.createdAt).toBe(1700000000n);
  });
});

describe('StateTreeLeaf serialization', () => {
  const mockLeaf: StateTreeLeaf = {
    leafIndex: 42n,
    leafValue: '0xleafvalue',
    treeRoot: '0xtreeroot',
    treeSize: 1000n,
    poolId: '0xpool',
  };

  it('should serialize state tree leaf with bigint fields as strings', () => {
    const serialized = serializeStateTreeLeaf(mockLeaf);

    expect(serialized.leafIndex).toBe('42');
    expect(serialized.treeSize).toBe('1000');
    expect(serialized.leafValue).toBe('0xleafvalue');
    expect(serialized.treeRoot).toBe('0xtreeroot');
  });

  it('should deserialize state tree leaf with string fields as bigints', () => {
    const serialized = serializeStateTreeLeaf(mockLeaf);
    const deserialized = deserializeStateTreeLeaf(serialized);

    expect(deserialized.leafIndex).toBe(42n);
    expect(deserialized.treeSize).toBe(1000n);
  });
});

describe('ASPApprovalList serialization', () => {
  const mockASP: ASPApprovalList = {
    id: 'asp-1',
    root: '0xasproot',
    ipfsCID: 'QmIPFSCID',
    timestamp: 1700000000n,
  };

  it('should serialize ASP approval list with bigint fields as strings', () => {
    const serialized = serializeASPApprovalList(mockASP);

    expect(serialized.timestamp).toBe('1700000000');
    expect(serialized.id).toBe('asp-1');
    expect(serialized.root).toBe('0xasproot');
    expect(serialized.ipfsCID).toBe('QmIPFSCID');
  });

  it('should deserialize ASP approval list with string fields as bigints', () => {
    const serialized = serializeASPApprovalList(mockASP);
    const deserialized = deserializeASPApprovalList(serialized);

    expect(deserialized.timestamp).toBe(1700000000n);
    expect(deserialized.id).toBe('asp-1');
  });
});
