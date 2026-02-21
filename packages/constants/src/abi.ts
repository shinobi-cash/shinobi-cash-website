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
    type: "function",
    name: "relay",
    inputs: [
      {
        name: "_withdrawal",
        type: "tuple",
        internalType: "struct IPrivacyPool.Withdrawal",
        components: [
          { name: "processooor", type: "address", internalType: "address" },
          { name: "data", type: "bytes", internalType: "bytes" },
        ],
      },
      {
        name: "_proof",
        type: "tuple",
        internalType: "struct ProofLib.WithdrawProof",
        components: [
          { name: "pA", type: "uint256[2]", internalType: "uint256[2]" },
          { name: "pB", type: "uint256[2][2]", internalType: "uint256[2][2]" },
          { name: "pC", type: "uint256[2]", internalType: "uint256[2]" },
          { name: "pubSignals", type: "uint256[8]", internalType: "uint256[8]" },
        ],
      },
      { name: "_scope", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

/**
 * ABI for cross-chain withdrawal (1:1)
 * 11 public signals:
 *   [0] newCommitmentHash, [1] existingNullifierHash, [2] refundCommitmentHash,
 *   [3] relayFeeBPSOut, [4] refundFeeBPSOut, [5] withdrawnValue,
 *   [6] stateRoot, [7] stateTreeDepth, [8] ASPRoot, [9] ASPTreeDepth,
 *   [10] context
 */
export const EntrypointCrosschainWithdrawalAbi = [
  {
    type: "function",
    name: "crosschainWithdrawal",
    inputs: [
      {
        name: "_withdrawal",
        type: "tuple",
        internalType: "struct IPrivacyPool.Withdrawal",
        components: [
          { name: "processooor", type: "address", internalType: "address" },
          { name: "data", type: "bytes", internalType: "bytes" },
        ],
      },
      {
        name: "_proof",
        type: "tuple",
        internalType: "struct CrosschainProofLib.CrosschainWithdrawProof",
        components: [
          { name: "pA", type: "uint256[2]", internalType: "uint256[2]" },
          { name: "pB", type: "uint256[2][2]", internalType: "uint256[2][2]" },
          { name: "pC", type: "uint256[2]", internalType: "uint256[2]" },
          { name: "pubSignals", type: "uint256[11]", internalType: "uint256[11]" },
        ],
      },
      { name: "_scope", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

/**
 * ABI for same-chain deposit
 */
export const EntrypointDepositAbi = [
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "_precommitment", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "_commitment", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },
] as const;

// ============ WITHDRAW2 (2:1 JoinSplit) ABIs ============

/**
 * ABI for same-chain Withdraw2 relay (2:1 merge)
 * Uses 9 public signals (no refund commitment)
 */
export const EntrypointWithdraw2RelayAbi = [
  {
    type: "function",
    name: "relay2",
    inputs: [
      {
        name: "_withdrawal",
        type: "tuple",
        internalType: "struct IPrivacyPool.Withdrawal",
        components: [
          { name: "processooor", type: "address", internalType: "address" },
          { name: "data", type: "bytes", internalType: "bytes" },
        ],
      },
      {
        name: "_proof",
        type: "tuple",
        internalType: "struct Withdraw2ProofLib.Withdraw2Proof",
        components: [
          { name: "pA", type: "uint256[2]", internalType: "uint256[2]" },
          { name: "pB", type: "uint256[2][2]", internalType: "uint256[2][2]" },
          { name: "pC", type: "uint256[2]", internalType: "uint256[2]" },
          { name: "pubSignals", type: "uint256[9]", internalType: "uint256[9]" },
        ],
      },
      { name: "_scope", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

/**
 * ABI for cross-chain Withdraw2 (2:1 merge with refund commitment)
 * 12 public signals:
 *   [0] newCommitmentHash, [1] nullifierHash0, [2] nullifierHash1,
 *   [3] refundCommitmentHash, [4] relayFeeBPSOut, [5] refundFeeBPSOut,
 *   [6] withdrawnValue, [7] stateRoot, [8] stateTreeDepth,
 *   [9] ASPRoot, [10] ASPTreeDepth, [11] context
 */
export const EntrypointCrosschainWithdraw2Abi = [
  {
    type: "function",
    name: "crossChainWithdrawal2",
    inputs: [
      {
        name: "_withdrawal",
        type: "tuple",
        internalType: "struct IPrivacyPool.Withdrawal",
        components: [
          { name: "processooor", type: "address", internalType: "address" },
          { name: "data", type: "bytes", internalType: "bytes" },
        ],
      },
      {
        name: "_proof",
        type: "tuple",
        internalType: "struct CrosschainWithdraw2ProofLib.CrosschainWithdraw2Proof",
        components: [
          { name: "pA", type: "uint256[2]", internalType: "uint256[2]" },
          { name: "pB", type: "uint256[2][2]", internalType: "uint256[2][2]" },
          { name: "pC", type: "uint256[2]", internalType: "uint256[2]" },
          { name: "pubSignals", type: "uint256[12]", internalType: "uint256[12]" },
        ],
      },
      { name: "_scope", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ============ POOL ABIs ============

/**
 * ABI for reading the pool SCOPE
 */
export const PoolScopeAbi = [
  {
    type: "function",
    name: "SCOPE",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
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
    type: "function",
    name: "ragequit",
    inputs: [
      {
        name: "_proof",
        type: "tuple",
        internalType: "struct ProofLib.RagequitProof",
        components: [
          { name: "pA", type: "uint256[2]", internalType: "uint256[2]" },
          { name: "pB", type: "uint256[2][2]", internalType: "uint256[2][2]" },
          { name: "pC", type: "uint256[2]", internalType: "uint256[2]" },
          { name: "pubSignals", type: "uint256[4]", internalType: "uint256[4]" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
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
    type: "function",
    name: "deposit",
    inputs: [{ name: "precommitment", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "depositWithCustomParams",
    inputs: [
      { name: "precommitment", type: "uint256", internalType: "uint256" },
      { name: "customSolverFeeBPS", type: "uint256", internalType: "uint256" },
      { name: "customFillDeadline", type: "uint32", internalType: "uint32" },
      { name: "customExpiry", type: "uint32", internalType: "uint32" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
] as const;

/**
 * ABI for reading crosschain deposit entrypoint configuration
 */
export const CrosschainDepositConfigAbi = [
  {
    type: "function",
    name: "defaultSolverFeeBPS",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "defaultFillDeadline",
    inputs: [],
    outputs: [{ name: "", type: "uint32", internalType: "uint32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "defaultExpiry",
    inputs: [],
    outputs: [{ name: "", type: "uint32", internalType: "uint32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "maxSolverFeeBPS",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ============ INPUT SETTLER (REFUND) ABIs ============

/**
 * Shared ShinobiIntent tuple components used across settler ABIs.
 * Matches ShinobiIntentType.ShinobiIntent struct from contracts.
 */
const ShinobiIntentComponents = [
  { name: "user", type: "address", internalType: "address" },
  { name: "nonce", type: "uint256", internalType: "uint256" },
  { name: "originChainId", type: "uint256", internalType: "uint256" },
  { name: "expires", type: "uint32", internalType: "uint32" },
  { name: "fillDeadline", type: "uint32", internalType: "uint32" },
  { name: "fillOracle", type: "address", internalType: "address" },
  { name: "inputs", type: "uint256[2][]", internalType: "uint256[2][]" },
  {
    name: "outputs",
    type: "tuple[]",
    internalType: "struct MandateOutputType.MandateOutput[]",
    components: [
      { name: "oracle", type: "bytes32", internalType: "bytes32" },
      { name: "settler", type: "bytes32", internalType: "bytes32" },
      { name: "chainId", type: "uint256", internalType: "uint256" },
      { name: "token", type: "bytes32", internalType: "bytes32" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "recipient", type: "bytes32", internalType: "bytes32" },
      { name: "call", type: "bytes", internalType: "bytes" },
      { name: "context", type: "bytes", internalType: "bytes" },
    ],
  },
  { name: "intentOracle", type: "address", internalType: "address" },
  { name: "refundCalldata", type: "bytes", internalType: "bytes" },
] as const;

/**
 * ABI for ShinobiInputSettler.refund(ShinobiIntent)
 * Permissionless after intent.expires — anyone can call
 */
export const InputSettlerRefundAbi = [
  {
    type: "function",
    name: "refund",
    inputs: [
      {
        name: "intent",
        type: "tuple",
        internalType: "struct ShinobiIntentType.ShinobiIntent",
        components: ShinobiIntentComponents,
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

/**
 * ABI for reading intent order status
 * OrderStatus: 0=None, 1=Deposited, 2=Claimed, 3=Refunded
 */
export const InputSettlerOrderStatusAbi = [
  {
    type: "function",
    name: "orderStatus",
    inputs: [{ name: "orderId", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "uint8", internalType: "enum OrderStatus" }],
    stateMutability: "view",
  },
] as const;
