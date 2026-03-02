import type {
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
} from "../types/index.js";

// ============================================
// Individual Type Guards
// ============================================

/**
 * Check if activity is a same-chain deposit
 */
export const isDeposit = (activity: ActivityItem): activity is DepositActivity =>
  activity.type === "DEPOSIT";

/**
 * Check if activity is a crosschain deposit fill
 */
export const isCrosschainDepositFill = (
  activity: ActivityItem
): activity is CrosschainDepositFillActivity => activity.type === "CROSSCHAIN_DEPOSIT_FILL";

/**
 * Check if activity is a crosschain deposit intent
 */
export const isCrosschainDepositIntent = (
  activity: ActivityItem
): activity is CrosschainDepositIntentActivity => activity.type === "CROSSCHAIN_DEPOSIT_INTENT";

/**
 * Check if activity is a crosschain deposit refund
 */
export const isCrosschainDepositRefund = (
  activity: ActivityItem
): activity is CrosschainDepositRefundActivity => activity.type === "CROSSCHAIN_DEPOSIT_REFUND";

/**
 * Check if activity is a same-chain 1:1 withdrawal
 */
export const isWithdraw = (activity: ActivityItem): activity is WithdrawActivity =>
  activity.type === "WITHDRAW";

/**
 * Check if activity is a same-chain 2:1 withdrawal
 */
export const isWithdraw2 = (activity: ActivityItem): activity is Withdraw2Activity =>
  activity.type === "WITHDRAW_2";

/**
 * Check if activity is a crosschain 1:1 withdrawal intent
 */
export const isCrosschainWithdrawIntent = (
  activity: ActivityItem
): activity is CrosschainWithdrawIntentActivity => activity.type === "CROSSCHAIN_WITHDRAW_INTENT";

/**
 * Check if activity is a crosschain 2:1 withdrawal intent
 */
export const isCrosschainWithdraw2Intent = (
  activity: ActivityItem
): activity is CrosschainWithdraw2IntentActivity =>
  activity.type === "CROSSCHAIN_WITHDRAW_2_INTENT";

/**
 * Check if activity is a crosschain withdrawal fill
 */
export const isCrosschainWithdrawalFill = (
  activity: ActivityItem
): activity is CrosschainWithdrawalFillActivity => activity.type === "CROSSCHAIN_WITHDRAWAL_FILL";

/**
 * Check if activity is a crosschain withdrawal refund
 */
export const isCrosschainWithdrawalRefund = (
  activity: ActivityItem
): activity is CrosschainWithdrawalRefundActivity =>
  activity.type === "CROSSCHAIN_WITHDRAWAL_REFUND";

/**
 * Check if activity is a ragequit
 */
export const isRagequit = (activity: ActivityItem): activity is RagequitActivity =>
  activity.type === "RAGEQUIT";

// ============================================
// Composite Type Guards
// ============================================

/**
 * Check if activity is any withdrawal (same-chain 1:1 or 2:1)
 */
export const isWithdrawal = (
  activity: ActivityItem
): activity is WithdrawActivity | Withdraw2Activity =>
  activity.type === "WITHDRAW" || activity.type === "WITHDRAW_2";

/**
 * Check if activity is any deposit (same-chain or crosschain fill)
 */
export const isAnyDeposit = (
  activity: ActivityItem
): activity is DepositActivity | CrosschainDepositFillActivity =>
  activity.type === "DEPOSIT" || activity.type === "CROSSCHAIN_DEPOSIT_FILL";

/**
 * Check if activity is a cross-chain intent
 */
export const isIntent = (
  activity: ActivityItem
): activity is
  | CrosschainDepositIntentActivity
  | CrosschainWithdrawIntentActivity
  | CrosschainWithdraw2IntentActivity =>
  activity.type === "CROSSCHAIN_DEPOSIT_INTENT" ||
  activity.type === "CROSSCHAIN_WITHDRAW_INTENT" ||
  activity.type === "CROSSCHAIN_WITHDRAW_2_INTENT";

/**
 * Check if activity is a cross-chain fill
 */
export const isFill = (
  activity: ActivityItem
): activity is CrosschainDepositFillActivity | CrosschainWithdrawalFillActivity =>
  activity.type === "CROSSCHAIN_DEPOSIT_FILL" || activity.type === "CROSSCHAIN_WITHDRAWAL_FILL";

/**
 * Check if activity is a refund
 */
export const isRefund = (
  activity: ActivityItem
): activity is CrosschainDepositRefundActivity | CrosschainWithdrawalRefundActivity =>
  activity.type === "CROSSCHAIN_DEPOSIT_REFUND" || activity.type === "CROSSCHAIN_WITHDRAWAL_REFUND";

/**
 * Check if activity is cross-chain related
 */
export const isCrossChain = (activity: ActivityItem): boolean =>
  isIntent(activity) || isFill(activity) || isRefund(activity);

/**
 * Check if activity is same-chain only
 */
export const isSameChain = (
  activity: ActivityItem
): activity is DepositActivity | WithdrawActivity | Withdraw2Activity | RagequitActivity =>
  activity.type === "DEPOSIT" ||
  activity.type === "WITHDRAW" ||
  activity.type === "WITHDRAW_2" ||
  activity.type === "RAGEQUIT";

/**
 * Check if activity is any cross-chain withdrawal (intent, fill, or refund)
 */
export const isAnyCrosschainWithdrawal = (
  activity: ActivityItem
): activity is
  | CrosschainWithdrawIntentActivity
  | CrosschainWithdraw2IntentActivity
  | CrosschainWithdrawalFillActivity
  | CrosschainWithdrawalRefundActivity =>
  activity.type === "CROSSCHAIN_WITHDRAW_INTENT" ||
  activity.type === "CROSSCHAIN_WITHDRAW_2_INTENT" ||
  activity.type === "CROSSCHAIN_WITHDRAWAL_FILL" ||
  activity.type === "CROSSCHAIN_WITHDRAWAL_REFUND";
