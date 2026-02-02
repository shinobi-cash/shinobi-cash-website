/**
 * Minimal ABIs
 *
 * Contains only the specific ABI entries actually used by the SDK.
 * This significantly reduces bundle size compared to full contract ABIs.
 */

// ============ ENTRYPOINT ABIs ============

/**
 * ABI for same-chain relay withdrawal
 */
export const EntrypointRelayAbi = [
  {
    type: 'function',
    name: 'relay',
    inputs: [
      {
        name: '_withdrawal',
        type: 'tuple',
        internalType: 'struct IShinobiCashEntrypoint.Withdrawal',
        components: [
          { name: 'processooor', type: 'address', internalType: 'address' },
          { name: 'data', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: '_proof',
        type: 'tuple',
        internalType: 'struct IShinobiCashEntrypoint.Groth16Proof',
        components: [
          { name: 'pA', type: 'uint256[2]', internalType: 'uint256[2]' },
          { name: 'pB', type: 'uint256[2][2]', internalType: 'uint256[2][2]' },
          { name: 'pC', type: 'uint256[2]', internalType: 'uint256[2]' },
          { name: 'pubSignals', type: 'uint256[8]', internalType: 'uint256[8]' },
        ],
      },
      { name: '_scope', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

/**
 * ABI for cross-chain withdrawal
 */
export const EntrypointCrosschainWithdrawalAbi = [
  {
    type: 'function',
    name: 'crosschainWithdrawal',
    inputs: [
      {
        name: '_withdrawal',
        type: 'tuple',
        internalType: 'struct IShinobiCashEntrypoint.Withdrawal',
        components: [
          { name: 'processooor', type: 'address', internalType: 'address' },
          { name: 'data', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: '_proof',
        type: 'tuple',
        internalType: 'struct IShinobiCashEntrypoint.Groth16ProofCrosschain',
        components: [
          { name: 'pA', type: 'uint256[2]', internalType: 'uint256[2]' },
          { name: 'pB', type: 'uint256[2][2]', internalType: 'uint256[2][2]' },
          { name: 'pC', type: 'uint256[2]', internalType: 'uint256[2]' },
          { name: 'pubSignals', type: 'uint256[9]', internalType: 'uint256[9]' },
        ],
      },
      { name: '_scope', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

/**
 * ABI for same-chain deposit
 */
export const EntrypointDepositAbi = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: '_precommitment', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [
      { name: '_commitment', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'payable',
  },
] as const;

// ============ WITHDRAW2 (2:1 JoinSplit) ABIs ============

/**
 * ABI for same-chain Withdraw2 relay (2:1 merge)
 * Uses 10 public signals
 */
export const EntrypointWithdraw2RelayAbi = [
  {
    type: 'function',
    name: 'relayWithdraw2',
    inputs: [
      {
        name: '_withdrawal',
        type: 'tuple',
        internalType: 'struct IShinobiCashEntrypoint.Withdrawal',
        components: [
          { name: 'processooor', type: 'address', internalType: 'address' },
          { name: 'data', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: '_proof',
        type: 'tuple',
        internalType: 'struct IShinobiCashEntrypoint.Groth16ProofWithdraw2',
        components: [
          { name: 'pA', type: 'uint256[2]', internalType: 'uint256[2]' },
          { name: 'pB', type: 'uint256[2][2]', internalType: 'uint256[2][2]' },
          { name: 'pC', type: 'uint256[2]', internalType: 'uint256[2]' },
          { name: 'pubSignals', type: 'uint256[10]', internalType: 'uint256[10]' },
        ],
      },
      { name: '_scope', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

/**
 * ABI for cross-chain Withdraw2 (2:1 merge with refund commitment)
 * Uses 10 public signals (refundCommitmentHash included)
 */
export const EntrypointCrosschainWithdraw2Abi = [
  {
    type: 'function',
    name: 'crosschainWithdraw2',
    inputs: [
      {
        name: '_withdrawal',
        type: 'tuple',
        internalType: 'struct IShinobiCashEntrypoint.Withdrawal',
        components: [
          { name: 'processooor', type: 'address', internalType: 'address' },
          { name: 'data', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: '_proof',
        type: 'tuple',
        internalType: 'struct IShinobiCashEntrypoint.Groth16ProofWithdraw2',
        components: [
          { name: 'pA', type: 'uint256[2]', internalType: 'uint256[2]' },
          { name: 'pB', type: 'uint256[2][2]', internalType: 'uint256[2][2]' },
          { name: 'pC', type: 'uint256[2]', internalType: 'uint256[2]' },
          { name: 'pubSignals', type: 'uint256[10]', internalType: 'uint256[10]' },
        ],
      },
      { name: '_scope', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// ============ POOL ABIs ============

/**
 * ABI for reading the pool SCOPE
 */
export const PoolScopeAbi = [
  {
    type: 'function',
    name: 'SCOPE',
    inputs: [],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;

// ============ CROSS-CHAIN DEPOSIT ABIs ============

/**
 * ABI for cross-chain deposit with custom fee
 */
export const CrosschainDepositEntrypointAbi = [
  {
    type: 'function',
    name: 'depositWithCustomFee',
    inputs: [
      { name: 'precommitment', type: 'uint256', internalType: 'uint256' },
      { name: 'customSolverFeeBPS', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
] as const;
