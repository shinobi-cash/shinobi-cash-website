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
        internalType: 'struct IPrivacyPool.Withdrawal',
        components: [
          { name: 'processooor', type: 'address', internalType: 'address' },
          { name: 'data', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: '_proof',
        type: 'tuple',
        internalType: 'struct ProofLib.WithdrawProof',
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
 * ABI for cross-chain withdrawal (1:1)
 * 13 public signals:
 *   [0] newCommitmentHash, [1] existingNullifierHash, [2] refundCommitmentHash,
 *   [3] relayFeeBPSOut, [4] refundFeeBPSOut, [5] withdrawnValue,
 *   [6] stateRoot, [7] stateTreeDepth, [8] ASPRoot, [9] ASPTreeDepth,
 *   [10] context, [11] relayFeeBPS, [12] refundFeeBPS
 */
export const EntrypointCrosschainWithdrawalAbi = [
  {
    type: 'function',
    name: 'crosschainWithdrawal',
    inputs: [
      {
        name: '_withdrawal',
        type: 'tuple',
        internalType: 'struct IPrivacyPool.Withdrawal',
        components: [
          { name: 'processooor', type: 'address', internalType: 'address' },
          { name: 'data', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: '_proof',
        type: 'tuple',
        internalType: 'struct CrosschainProofLib.CrosschainWithdrawProof',
        components: [
          { name: 'pA', type: 'uint256[2]', internalType: 'uint256[2]' },
          { name: 'pB', type: 'uint256[2][2]', internalType: 'uint256[2][2]' },
          { name: 'pC', type: 'uint256[2]', internalType: 'uint256[2]' },
          { name: 'pubSignals', type: 'uint256[13]', internalType: 'uint256[13]' },
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
 * Uses 9 public signals (no refund commitment)
 */
export const EntrypointWithdraw2RelayAbi = [
  {
    type: 'function',
    name: 'relay2',
    inputs: [
      {
        name: '_withdrawal',
        type: 'tuple',
        internalType: 'struct IPrivacyPool.Withdrawal',
        components: [
          { name: 'processooor', type: 'address', internalType: 'address' },
          { name: 'data', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: '_proof',
        type: 'tuple',
        internalType: 'struct Withdraw2ProofLib.Withdraw2Proof',
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
 * ABI for cross-chain Withdraw2 (2:1 merge with refund commitment)
 * 14 public signals:
 *   [0] newCommitmentHash, [1] nullifierHash0, [2] nullifierHash1,
 *   [3] refundCommitmentHash, [4] relayFeeBPSOut, [5] refundFeeBPSOut,
 *   [6] withdrawnValue, [7] stateRoot, [8] stateTreeDepth,
 *   [9] ASPRoot, [10] ASPTreeDepth, [11] context,
 *   [12] relayFeeBPS, [13] refundFeeBPS
 */
export const EntrypointCrosschainWithdraw2Abi = [
  {
    type: 'function',
    name: 'crossChainWithdrawal2',
    inputs: [
      {
        name: '_withdrawal',
        type: 'tuple',
        internalType: 'struct IPrivacyPool.Withdrawal',
        components: [
          { name: 'processooor', type: 'address', internalType: 'address' },
          { name: 'data', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: '_proof',
        type: 'tuple',
        internalType: 'struct CrosschainWithdraw2ProofLib.CrosschainWithdraw2Proof',
        components: [
          { name: 'pA', type: 'uint256[2]', internalType: 'uint256[2]' },
          { name: 'pB', type: 'uint256[2][2]', internalType: 'uint256[2][2]' },
          { name: 'pC', type: 'uint256[2]', internalType: 'uint256[2]' },
          { name: 'pubSignals', type: 'uint256[14]', internalType: 'uint256[14]' },
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

// ============ RAGEQUIT ABIs ============

/**
 * ABI for ragequit (emergency exit)
 * Allows original depositor to publicly withdraw without ASP approval
 * RagequitProof has 4 public signals: [commitmentHash, nullifierHash, value, label]
 */
export const PoolRagequitAbi = [
  {
    type: 'function',
    name: 'ragequit',
    inputs: [
      {
        name: '_proof',
        type: 'tuple',
        internalType: 'struct ProofLib.RagequitProof',
        components: [
          { name: 'pA', type: 'uint256[2]', internalType: 'uint256[2]' },
          { name: 'pB', type: 'uint256[2][2]', internalType: 'uint256[2][2]' },
          { name: 'pC', type: 'uint256[2]', internalType: 'uint256[2]' },
          { name: 'pubSignals', type: 'uint256[4]', internalType: 'uint256[4]' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// ============ CROSS-CHAIN DEPOSIT ABIs ============

/**
 * ABI for cross-chain deposit entrypoint
 * - deposit: Uses default solver fee and deadlines
 * - depositWithCustomParams: Allows custom solver fee and deadline configuration
 */
export const CrosschainDepositEntrypointAbi = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'precommitment', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'depositWithCustomParams',
    inputs: [
      { name: 'precommitment', type: 'uint256', internalType: 'uint256' },
      { name: 'customSolverFeeBPS', type: 'uint256', internalType: 'uint256' },
      { name: 'customFillDeadline', type: 'uint32', internalType: 'uint32' },
      { name: 'customExpiry', type: 'uint32', internalType: 'uint32' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
] as const;
