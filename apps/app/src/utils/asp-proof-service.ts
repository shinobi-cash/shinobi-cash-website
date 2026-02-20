/**
 * ASP Proof Service
 *
 * Fetches precomputed ASP merkle proofs from IPFS (v2.1 format).
 * Eliminates client-side tree building for withdrawals.
 */

import { indexerClient } from "@/lib/indexer/client";

// IPFS gateways with fallback
const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
  "https://ipfs.io/ipfs",
];

const FETCH_TIMEOUT_MS = 15000;

// v2.1 main file format
interface ASPApprovalListV21 {
  version: "2.1";
  numSubtrees: number;
  root: string;
  treeDepth: number;
  totalLabels: number;
  timestamp: number;
  subtrees: SubtreeInfoV21[];
}

interface SubtreeInfoV21 {
  index: number;
  labelCount: number;
  proofsCid: string;
  hash: string;
}

// v2.1 subtree proof file format
interface SubtreeProofFile {
  subtreeIndex: number;
  labels: string[];
  siblings: string[][];
}

// Result returned to the client
export interface ASPProofResult {
  aspRoot: string;
  treeDepth: number;
  siblings: string[];
  index: number;
}

/**
 * Fetch JSON from IPFS with gateway fallback
 */
async function fetchFromIPFS<T>(cid: string): Promise<T> {
  let lastError: Error | null = null;

  for (const gateway of IPFS_GATEWAYS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(`${gateway}/${cid}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (err) {
      lastError = err as Error;
      console.warn(`[asp-proof-service] Gateway ${gateway} failed:`, lastError.message);
      continue;
    }
  }

  throw new Error(`Failed to fetch IPFS ${cid}: ${lastError?.message}`);
}

/**
 * Binary search for a label in a sorted array
 * Returns the index in the subtree, not the global index
 */
function binarySearchLabel(sortedLabels: string[], target: string): number {
  const targetBigInt = BigInt(target);
  let left = 0;
  let right = sortedLabels.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midValue = BigInt(sortedLabels[mid]!);

    if (midValue === targetBigInt) {
      return mid;
    } else if (midValue < targetBigInt) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
}

/**
 * Get subtree index for a label
 */
function getSubtreeIndex(label: string, numSubtrees: number): number {
  return Number(BigInt(label) % BigInt(numSubtrees));
}

/**
 * Compute global index from subtree position
 * Global index = sum(labelCount for subtrees 0 to i-1) + localIndex
 */
function computeGlobalIndex(
  subtrees: SubtreeInfoV21[],
  subtreeIndex: number,
  localIndex: number
): number {
  let globalIndex = 0;
  for (let i = 0; i < subtreeIndex; i++) {
    globalIndex += subtrees[i]!.labelCount;
  }
  return globalIndex + localIndex;
}

/**
 * Fetch ASP proof for a single label
 *
 * @param label - The label (bigint as string) to get proof for
 * @returns ASP proof including siblings and index
 * @throws Error if label not found or IPFS fetch fails
 */
export async function getASPProof(label: bigint): Promise<ASPProofResult> {
  const labelStr = label.toString();

  // 1. Get latest ASP root info from indexer
  const aspRootInfo = await indexerClient.asp.fetchLatestASPRoot();
  if (!aspRootInfo) {
    throw new Error("No ASP root found in indexer");
  }

  // 2. Fetch main IPFS file
  const mainFile = await fetchFromIPFS<ASPApprovalListV21>(aspRootInfo.ipfsCid);

  if (mainFile.version !== "2.1") {
    throw new Error(`Unsupported ASP format version: ${mainFile.version}. Expected 2.1`);
  }

  // 3. Determine which subtree the label belongs to
  const subtreeIndex = getSubtreeIndex(labelStr, mainFile.numSubtrees);
  const subtreeInfo = mainFile.subtrees[subtreeIndex];

  if (!subtreeInfo) {
    throw new Error(`Subtree ${subtreeIndex} not found in ASP file`);
  }

  if (subtreeInfo.labelCount === 0 || !subtreeInfo.proofsCid) {
    throw new Error(`Label ${labelStr} not found: subtree ${subtreeIndex} is empty`);
  }

  // 4. Fetch subtree proof file
  const proofFile = await fetchFromIPFS<SubtreeProofFile>(subtreeInfo.proofsCid);

  // 5. Binary search for the label
  const localIndex = binarySearchLabel(proofFile.labels, labelStr);

  if (localIndex === -1) {
    throw new Error(`Label ${labelStr} not found in subtree ${subtreeIndex}`);
  }

  // 6. Get proof at localIndex
  const siblings = proofFile.siblings[localIndex];
  if (!siblings) {
    throw new Error(`Proof not found for label ${labelStr} at index ${localIndex}`);
  }

  // 7. Compute global index
  const globalIndex = computeGlobalIndex(mainFile.subtrees, subtreeIndex, localIndex);

  return {
    aspRoot: mainFile.root,
    treeDepth: mainFile.treeDepth,
    siblings,
    index: globalIndex,
  };
}

/**
 * Fetch ASP proofs for two labels (Withdraw2)
 *
 * @param primaryLabel - First label
 * @param secondaryLabel - Second label
 * @returns Both proofs
 */
export async function getASPProofsForWithdraw2(
  primaryLabel: bigint,
  secondaryLabel: bigint
): Promise<{ primary: ASPProofResult; secondary: ASPProofResult }> {
  // Fetch both proofs in parallel
  const [primary, secondary] = await Promise.all([
    getASPProof(primaryLabel),
    getASPProof(secondaryLabel),
  ]);

  // Verify both proofs are against the same ASP root
  if (primary.aspRoot !== secondary.aspRoot) {
    throw new Error("ASP root mismatch between primary and secondary labels");
  }

  return { primary, secondary };
}
