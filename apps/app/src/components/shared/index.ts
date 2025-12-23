/**
 * Shared Components - Barrel Export
 * Reusable components following Single Responsibility Principle
 */

// Generic UI Components
export { CopyableField, type CopyableFieldProps } from "./CopyableField";
export { DetailRow, type DetailRowProps } from "./DetailRow";
export { SectionCard, type SectionCardProps } from "./SectionCard";
export { ExternalLink, type ExternalLinkProps } from "./ExternalLink";

// Activity-specific Components
export { ChainBadge, type ChainBadgeProps } from "./activity/ChainBadge";
export { ActivityStatusBadge, type ActivityStatusBadgeProps } from "./activity/ActivityStatusBadge";
export { AmountSection, type AmountSectionProps } from "./activity/AmountSection";
export {
  CrossChainFlowSection,
  type CrossChainFlowSectionProps,
} from "./activity/CrossChainFlowSection";
