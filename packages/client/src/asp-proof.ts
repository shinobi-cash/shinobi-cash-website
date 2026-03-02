/**
 * ASP Proof Resolution — fetches precomputed ASP merkle proofs from IPFS (v2.1 format)
 */

import type { PrecomputedASPProof } from "@shinobi-cash/core/proof";

const DEFAULT_IPFS_GATEWAYS = [
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
  indices: number[];
}

/**
 * Fetch JSON from IPFS with gateway fallback
 */
async function fetchFromIPFS<T>(cid: string, gateways: string[]): Promise<T> {
  let lastError: Error | null = null;

  for (const gateway of gateways) {
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
      continue;
    }
  }

  throw new Error(`Failed to fetch IPFS ${cid}: ${lastError?.message}`);
}

function binarySearchLabel(sortedLabels: string[], target: string): number {
  const targetBigInt = BigInt(target);
  let left = 0;
  let right = sortedLabels.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midValue = BigInt(sortedLabels[mid]!);

    if (midValue === targetBigInt) return mid;
    if (midValue < targetBigInt) left = mid + 1;
    else right = mid - 1;
  }

  return -1;
}

function getSubtreeIndex(label: string, numSubtrees: number): number {
  return Number(BigInt(label) % BigInt(numSubtrees));
}

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
 * Resolve a single label's precomputed ASP proof from IPFS
 */
async function resolveFromMainFile(
  mainFile: ASPApprovalListV21,
  label: bigint,
  gateways: string[]
): Promise<PrecomputedASPProof> {
  const labelStr = label.toString();

  const subtreeIndex = getSubtreeIndex(labelStr, mainFile.numSubtrees);
  const subtreeInfo = mainFile.subtrees[subtreeIndex];

  if (!subtreeInfo) {
    throw new Error(`Subtree ${subtreeIndex} not found in ASP file`);
  }
  if (subtreeInfo.labelCount === 0 || !subtreeInfo.proofsCid) {
    throw new Error(`Label ${labelStr} not found: subtree ${subtreeIndex} is empty`);
  }

  const proofFile = await fetchFromIPFS<SubtreeProofFile>(subtreeInfo.proofsCid, gateways);

  const localIndex = binarySearchLabel(proofFile.labels, labelStr);
  if (localIndex === -1) {
    throw new Error(`Label ${labelStr} not found in subtree ${subtreeIndex}`);
  }

  const siblings = proofFile.siblings[localIndex];
  if (!siblings) {
    throw new Error(`Proof not found for label ${labelStr} at index ${localIndex}`);
  }

  // Use the stored global index from the proof file (the position in the globally sorted tree)
  // Falls back to computeGlobalIndex for older proof files without indices
  const globalIndex =
    proofFile.indices?.[localIndex] ??
    computeGlobalIndex(mainFile.subtrees, subtreeIndex, localIndex);

  return {
    aspRoot: mainFile.root,
    treeDepth: mainFile.treeDepth,
    siblings,
    index: globalIndex,
  };
}

/**
 * Resolve a precomputed ASP proof for a single label
 */
export async function resolveASPProof(
  ipfsCid: string,
  label: bigint,
  gateways: string[] = DEFAULT_IPFS_GATEWAYS
): Promise<PrecomputedASPProof> {
  const mainFile = await fetchFromIPFS<ASPApprovalListV21>(ipfsCid, gateways);

  if (mainFile.version !== "2.1") {
    throw new Error(`Unsupported ASP format version: ${mainFile.version}. Expected 2.1`);
  }

  return resolveFromMainFile(mainFile, label, gateways);
}

/**
 * Resolve precomputed ASP proofs for two labels (Withdraw2)
 * Fetches the main file once and resolves both labels from it
 */
export async function resolveASPProofsForWithdraw2(
  ipfsCid: string,
  primaryLabel: bigint,
  secondaryLabel: bigint,
  gateways: string[] = DEFAULT_IPFS_GATEWAYS
): Promise<{ primary: PrecomputedASPProof; secondary: PrecomputedASPProof }> {
  const mainFile = await fetchFromIPFS<ASPApprovalListV21>(ipfsCid, gateways);

  if (mainFile.version !== "2.1") {
    throw new Error(`Unsupported ASP format version: ${mainFile.version}. Expected 2.1`);
  }

  const [primary, secondary] = await Promise.all([
    resolveFromMainFile(mainFile, primaryLabel, gateways),
    resolveFromMainFile(mainFile, secondaryLabel, gateways),
  ]);

  return { primary, secondary };
}
