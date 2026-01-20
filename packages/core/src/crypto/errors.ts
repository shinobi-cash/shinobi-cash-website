/**
 * Domain Errors for Withdrawal Operations
 *
 * Typed errors for better error handling and UX messaging.
 */

/**
 * Base class for withdrawal-related errors
 */
export class WithdrawalError extends Error {
  readonly code: string;
  readonly cause?: Error;

  constructor(code: string, message: string, cause?: Error) {
    super(message);
    this.name = 'WithdrawalError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Thrown when attempting to withdraw from an invalid note type
 */
export class InvalidWithdrawalNoteError extends WithdrawalError {
  readonly code = 'INVALID_WITHDRAWAL_NOTE';

  constructor(noteType: string, cause?: Error) {
    super(
      'INVALID_WITHDRAWAL_NOTE',
      `Cannot withdraw from ${noteType} note. Only deposit and change notes can be withdrawn.`,
      cause
    );
    this.name = 'InvalidWithdrawalNoteError';
  }
}

/**
 * Thrown when commitment is not found in the state tree
 */
export class CommitmentNotFoundError extends WithdrawalError {
  readonly code = 'COMMITMENT_NOT_FOUND';

  constructor(commitment: string, cause?: Error) {
    super(
      'COMMITMENT_NOT_FOUND',
      `Commitment ${commitment} not found in state tree. Ensure the note exists in the current pool state.`,
      cause
    );
    this.name = 'CommitmentNotFoundError';
  }
}

/**
 * Thrown when note label is not found in ASP tree
 */
export class LabelNotApprovedError extends WithdrawalError {
  readonly code = 'LABEL_NOT_APPROVED';

  constructor(label: string, cause?: Error) {
    super(
      'LABEL_NOT_APPROVED',
      `Note label ${label} not found in ASP tree. Ensure the label is approved by the ASP.`,
      cause
    );
    this.name = 'LabelNotApprovedError';
  }
}

/**
 * Thrown when circuit proof generation fails
 */
export class ProofGenerationError extends WithdrawalError {
  readonly code = 'PROOF_GENERATION_FAILED';

  constructor(message: string = 'ZK proof generation failed', cause?: Error) {
    super('PROOF_GENERATION_FAILED', message, cause);
    this.name = 'ProofGenerationError';
  }
}

/**
 * Thrown when circuit verification fails
 */
export class ProofVerificationError extends WithdrawalError {
  readonly code = 'PROOF_VERIFICATION_FAILED';

  constructor(message: string = 'ZK proof verification failed', cause?: Error) {
    super('PROOF_VERIFICATION_FAILED', message, cause);
    this.name = 'ProofVerificationError';
  }
}
