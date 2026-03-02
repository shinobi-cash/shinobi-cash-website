// Main client
export {
  IndexerClient,
  ActivityClient,
  StatsClient,
  StateTreeClient,
  IntentClient,
  PoolClient,
  ASPClient,
  type ASPRootInfo,
} from "./client/index.js";

// Types
export type {
  // Activity types
  ActivityType,
  UserActivityType,
  ASPStatus,
  ActivityItem,
  DepositActivity,
  CrosschainDepositFillActivity,
  CrosschainDepositIntentActivity,
  CrosschainDepositRefundActivity,
  WithdrawActivity,
  Withdraw2Activity,
  CrosschainWithdrawIntentActivity,
  CrosschainWithdraw2IntentActivity,
  CrosschainWithdrawalFillActivity,
  CrosschainWithdrawalRefundActivity,
  RagequitActivity,

  // Activity detail types
  TimelineEvent,
  ActivityDetailResponse,

  // Stats types
  DepositStats,
  WithdrawalStats,
  RagequitStats,
  SponsorshipStats,
  StatsResponse,

  // State tree types
  StateTreeLeaf,
  StateTreeResponse,

  // Intent types
  IntentType,
  IntentPhase,
  Intent,
  IntentFilters,
  RawShinobiIntent,
  RawMandateOutput,

  // Pool types
  Pool,

  // Pagination types
  PaginationMeta,
  PaginatedResponse,
  PaginationOptions,

  // Filter types
  ActivityFilters,
  StatsFilters,

  // Client types
  IndexerClientOptions,
} from "./types/index.js";

// Pagination utilities
export { PaginatedIterator } from "./pagination/iterator.js";

// Type guards
export {
  // Individual guards
  isDeposit,
  isCrosschainDepositFill,
  isCrosschainDepositIntent,
  isCrosschainDepositRefund,
  isWithdraw,
  isWithdraw2,
  isCrosschainWithdrawIntent,
  isCrosschainWithdraw2Intent,
  isCrosschainWithdrawalFill,
  isCrosschainWithdrawalRefund,
  isRagequit,
  // Composite guards
  isWithdrawal,
  isAnyDeposit,
  isIntent,
  isFill,
  isRefund,
  isCrossChain,
  isSameChain,
  isAnyCrosschainWithdrawal,
} from "./utils/guards.js";

// Converters
export { toBigInt, toNumber, toDate, formatEth, parseChainId } from "./utils/converters.js";

// Activity consolidation
export {
  consolidateActivities,
  filterByCategory,
  getActivityCounts,
  getActivityCategory,
  isCrossChainActivity,
  getActivityPriority,
  type ConsolidatedActivity,
  type ActivityCategory,
  type ActivityTimelineEvent,
} from "./utils/activity-consolidation.js";
