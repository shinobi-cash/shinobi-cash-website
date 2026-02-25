/**
 * Solver Quote Stub — returns contract defaults for cross-chain fees/timing.
 *
 * For deposits: reads from crosschain deposit contract on origin chain.
 * For withdrawals: returns INTENT_TIMING defaults from constants.
 *
 * Later, this route will proxy to the real solver service with API key auth.
 */

import { NextResponse } from "next/server";
import {
  FEE_CONFIG,
  INTENT_TIMING,
  SHINOBI_CASH_CROSSCHAIN_CONTRACTS,
  CrosschainDepositConfigAbi,
} from "@shinobi-cash/constants";
import { createPublicClient, http, type Chain } from "viem";
import { arbitrumSepolia, baseSepolia } from "viem/chains";

const CHAINS: Record<number, Chain> = {
  [arbitrumSepolia.id]: arbitrumSepolia,
  [baseSepolia.id]: baseSepolia,
};

interface QuoteRequest {
  originChainId: number;
  destinationChainId: number;
  amountWei: string;
  type: "deposit" | "withdrawal";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QuoteRequest;

    if (body.type === "withdrawal") {
      return NextResponse.json({
        solverFeeBPS: FEE_CONFIG.DEFAULT_SOLVER_FEE_BPS,
        fillDeadlineSeconds: INTENT_TIMING.FILL_DEADLINE_SECONDS,
        expirySeconds: INTENT_TIMING.EXPIRY_SECONDS,
        maxSolverFeeBPS: FEE_CONFIG.DEFAULT_SOLVER_FEE_BPS,
      });
    }

    // Deposit: read defaults from crosschain deposit contract on origin chain
    const contracts = SHINOBI_CASH_CROSSCHAIN_CONTRACTS as Record<
      number,
      { DEPOSIT_ENTRYPOINT?: { address: string } }
    >;
    const contract = contracts[body.originChainId];
    if (!contract?.DEPOSIT_ENTRYPOINT?.address) {
      return NextResponse.json(
        { error: `No crosschain deposit contract for chain ${body.originChainId}` },
        { status: 400 }
      );
    }

    const chain = CHAINS[body.originChainId];
    if (!chain) {
      return NextResponse.json(
        { error: `Unsupported chain ${body.originChainId}` },
        { status: 400 }
      );
    }

    const publicClient = createPublicClient({ chain, transport: http() });
    const address = contract.DEPOSIT_ENTRYPOINT.address as `0x${string}`;

    const [solverFeeBPS, fillDeadline, expiry, maxSolverFee] = await Promise.all([
      publicClient.readContract({
        address,
        abi: CrosschainDepositConfigAbi,
        functionName: "defaultSolverFeeBPS",
      }),
      publicClient.readContract({
        address,
        abi: CrosschainDepositConfigAbi,
        functionName: "defaultFillDeadline",
      }),
      publicClient.readContract({
        address,
        abi: CrosschainDepositConfigAbi,
        functionName: "defaultExpiry",
      }),
      publicClient.readContract({
        address,
        abi: CrosschainDepositConfigAbi,
        functionName: "maxSolverFeeBPS",
      }),
    ]);

    return NextResponse.json({
      solverFeeBPS: Number(solverFeeBPS),
      fillDeadlineSeconds: Number(fillDeadline),
      expirySeconds: Number(expiry),
      maxSolverFeeBPS: Number(maxSolverFee),
    });
  } catch (error) {
    console.error("[API] solver/quote error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Solver quote failed" },
      { status: 500 }
    );
  }
}
