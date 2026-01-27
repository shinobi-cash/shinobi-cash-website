/**
 * Data transformers for Shinobi Cash indexer
 * Handles BigInt serialization/deserialization for:
 * - Activity (deposits, withdrawals, cross-chain)
 * - Pool (privacy pool stats)
 * - StateTreeLeaf (merkle tree commitments)
 * - ASPApprovalList (association set updates)
 * - CrossChainIntent (cross-chain intent tracking)
 */

import type {
  Activity,
  SerializedActivity,
  Pool,
  SerializedPool,
  StateTreeLeaf,
  SerializedStateTreeLeaf,
  ASPApprovalList,
  SerializedASPApprovalList,
  CrossChainIntent,
  SerializedCrossChainIntent,
} from '../types/indexer.js';

/**
 * ========================================
 * TYPE UTILITIES
 * ========================================
 */

/**
 * Recursively converts bigint fields to string in a type
 * Used for serializing entities for JSON transport
 */
export type Serialized<T> = T extends bigint
  ? string
  : T extends Array<infer U>
    ? Array<Serialized<U>>
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

/**
 * Mapping from entity types to their serialized counterparts
 * Used for type-safe serialization
 */
export type SerializedEntityMap = {
  Activity: SerializedActivity;
  Pool: SerializedPool;
  StateTreeLeaf: SerializedStateTreeLeaf;
  ASPApprovalList: SerializedASPApprovalList;
  CrossChainIntent: SerializedCrossChainIntent;
};

/**
 * ========================================
 * UTILITY FUNCTIONS
 * ========================================
 */

/**
 * Safely parse a BigInt from a string
 *
 * @param value - String value to parse
 * @returns BigInt value or 0n if invalid
 */
export function safeBigIntParse(value: string | number | bigint | null | undefined): bigint {
  if (value === null || value === undefined) {
    return 0n;
  }

  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number') {
    return BigInt(Math.floor(value));
  }

  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

/**
 * ========================================
 * GENERIC CONVERSION FUNCTIONS
 * ========================================
 */

/**
 * Convert BigInt values to strings recursively
 *
 * @param obj - Entity object to convert
 * @returns Serialized entity with BigInt values as strings
 */
export function convertBigIntsToStrings<T>(obj: T): Serialized<T> {
  if (typeof obj === 'bigint') {
    return obj.toString() as Serialized<T>;
  }

  if (obj === null || obj === undefined) {
    return obj as Serialized<T>;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertBigIntsToStrings(item)) as Serialized<T>;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = convertBigIntsToStrings(obj[key]);
      }
    }
    return result as Serialized<T>;
  }

  return obj as Serialized<T>;
}

/**
 * Convert string values back to BigInt for specified fields
 *
 * @param obj - Serialized entity object
 * @param bigIntFields - Array of field names that should be converted to BigInt
 * @returns Entity with BigInt values restored
 *
 * @remarks
 * This function is intentionally typed with a generic return to allow
 * the specific deserialize functions (deserializeActivity, etc.) to
 * provide the correct concrete return type.
 */
export function convertStringsToBigInts<TInput, TOutput = TInput>(
  obj: TInput,
  bigIntFields: string[]
): TOutput {
  if (obj === null || obj === undefined) {
    return obj as unknown as TOutput;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertStringsToBigInts(item, bigIntFields)) as unknown as TOutput;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = (obj as Record<string, unknown>)[key];
        if (bigIntFields.includes(key) && (typeof value === 'string' || typeof value === 'number')) {
          result[key] = safeBigIntParse(value);
        } else if (typeof value === 'object') {
          result[key] = convertStringsToBigInts(value, bigIntFields);
        } else {
          result[key] = value;
        }
      }
    }
    return result as TOutput;
  }

  return obj as unknown as TOutput;
}

/**
 * ========================================
 * BIGINT FIELD DEFINITIONS
 * ========================================
 */

// Define which fields are BigInt for each entity type
const BIGINT_FIELDS = {
  activity: [
    'amount',
    'originalAmount',
    'vettingFeeAmount',
    'feeAmount',
    'feeRefund',
    'blockNumber',
    'timestamp',
    'originChainId',
    'destinationChainId',
  ],
  pool: ['totalDeposits', 'totalWithdrawals', 'depositCount', 'createdAt'],
  stateTreeLeaf: ['leafIndex', 'treeSize'],
  aspApprovalList: ['timestamp'],
  crossChainIntent: ['originChainId', 'destinationChainId', 'amount', 'createdAt'],
};

/**
 * ========================================
 * SERIALIZATION FUNCTIONS
 * ========================================
 */

export function serializeActivity(entity: Activity): SerializedActivity {
  return convertBigIntsToStrings(entity);
}

export function serializePool(entity: Pool): SerializedPool {
  return convertBigIntsToStrings(entity);
}

export function serializeStateTreeLeaf(entity: StateTreeLeaf): SerializedStateTreeLeaf {
  return convertBigIntsToStrings(entity);
}

export function serializeASPApprovalList(entity: ASPApprovalList): SerializedASPApprovalList {
  return convertBigIntsToStrings(entity);
}

export function serializeCrossChainIntent(entity: CrossChainIntent): SerializedCrossChainIntent {
  return convertBigIntsToStrings(entity);
}

/**
 * ========================================
 * DESERIALIZATION FUNCTIONS
 * ========================================
 */

export function deserializeActivity(entity: SerializedActivity): Activity {
  return convertStringsToBigInts(entity, BIGINT_FIELDS.activity);
}

export function deserializePool(entity: SerializedPool): Pool {
  return convertStringsToBigInts(entity, BIGINT_FIELDS.pool);
}

export function deserializeStateTreeLeaf(entity: SerializedStateTreeLeaf): StateTreeLeaf {
  return convertStringsToBigInts(entity, BIGINT_FIELDS.stateTreeLeaf);
}

export function deserializeASPApprovalList(entity: SerializedASPApprovalList): ASPApprovalList {
  return convertStringsToBigInts(entity, BIGINT_FIELDS.aspApprovalList);
}

export function deserializeCrossChainIntent(entity: SerializedCrossChainIntent): CrossChainIntent {
  return convertStringsToBigInts(entity, BIGINT_FIELDS.crossChainIntent);
}

/**
 * ========================================
 * CONVENIENCE EXPORTS
 * ========================================
 */

/**
 * All serialization functions
 */
export const serializers = {
  activity: serializeActivity,
  pool: serializePool,
  stateTreeLeaf: serializeStateTreeLeaf,
  aspApprovalList: serializeASPApprovalList,
  crossChainIntent: serializeCrossChainIntent,
};

/**
 * All deserialization functions
 */
export const deserializers = {
  activity: deserializeActivity,
  pool: deserializePool,
  stateTreeLeaf: deserializeStateTreeLeaf,
  aspApprovalList: deserializeASPApprovalList,
  crossChainIntent: deserializeCrossChainIntent,
};

/**
 * ========================================
 * ACTIVITY-SPECIFIC HELPERS
 * ========================================
 */

/**
 * Serialize activities with type-specific field handling
 *
 * @param activities - Array of activities to serialize
 * @returns Serialized activities with proper BigInt conversion
 */
export function serializeActivities(activities: Activity[]): SerializedActivity[] {
  return activities.map(serializeActivity);
}

/**
 * Deserialize activities with type-specific field handling
 *
 * @param activities - Array of serialized activities
 * @returns Activities with BigInt fields restored
 */
export function deserializeActivities(activities: SerializedActivity[]): Activity[] {
  return activities.map(deserializeActivity);
}
