// Main client
export {
  IndexerClient,
  ActivityClient,
  StatsClient,
  StateTreeClient,
  IntentClient,
  PoolClient,
  GraphQLClient,
  ASPClient,
  type ASPRootInfo,
} from "./client";

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
} from "./types";

// Pagination utilities
export { PaginatedIterator } from "./pagination/iterator";

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
} from "./utils/guards";

// Converters
export { toBigInt, toNumber, toDate, formatEth, parseChainId } from "./utils/converters";
