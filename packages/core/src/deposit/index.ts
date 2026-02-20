/**
 * @shinobi-cash/core/deposit
 */

import { createDeriveFn, derivePrecommitment } from "../crypto/primitives.js";

export { derivePrecommitment };

export const deriveDepositNullifier = createDeriveFn("shinobi.cash:DepositNullifierV1");
export const deriveDepositSecret = createDeriveFn("shinobi.cash:DepositSecretV1");
