/**
 * Business Logic Services
 */

// Discovery state management
export {
  initializeDiscoveryState,
  applyActivityPage,
} from './DiscoveryStateService.js';

export {
  NoteSyncEngine,
  type ActivityPage,
  type ActivityFetcher,
  type PersistenceCallbacks,
} from './NoteSyncEngine.js';

// Withdrawal circuit witness
export {
  buildWithdrawalTrees,
  buildWithdrawalCircuitWitness,
  buildCrosschainWithdrawalCircuitWitness,
  type WithdrawalTrees,
  type WithdrawalIntent,
  type WithdrawalCircuitWitness,
  type CrosschainWithdrawalCircuitWitness,
} from './WithdrawalCircuitWitness.js';
