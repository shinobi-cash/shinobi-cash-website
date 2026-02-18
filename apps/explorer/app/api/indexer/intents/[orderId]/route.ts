import { NextResponse } from "next/server";
import { indexerClient, CACHE_TTL } from "@/lib/indexer/client";

type Context = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { orderId } = await context.params;

    const intent = await indexerClient.intent.getById(orderId);
    if (!intent) {
      return NextResponse.json(
        { success: false, error: "Intent not found" },
        { status: 404 }
      );
    }

    const timeline = buildIntentTimeline(intent);

    return NextResponse.json(
      { success: true, data: { intent, timeline } },
      {
        headers: {
          "Cache-Control": `s-maxage=${CACHE_TTL.intents}, stale-while-revalidate`,
        },
      }
    );
  } catch (error) {
    console.error("[API] intent detail error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch intent" },
      { status: 500 }
    );
  }
}

function buildIntentTimeline(intent: {
  escrowTxHash: string;
  escrowTimestamp: string;
  fillTxHash: string | null;
  fillTimestamp: string | null;
  fillChainId: string | null;
  solver: string | null;
  finalizeTxHash: string | null;
  finalizeTimestamp: string | null;
  finalizeChainId: string | null;
  refundTxHash: string | null;
  refundTimestamp: string | null;
  refundChainId: string | null;
  originChainId: string;
}) {
  const timeline: Array<{
    phase: string;
    txHash: string;
    timestamp: string;
    chainId: string;
    solver?: string;
  }> = [];

  timeline.push({
    phase: "ESCROWED",
    txHash: intent.escrowTxHash,
    timestamp: intent.escrowTimestamp,
    chainId: intent.originChainId,
  });

  if (intent.fillTxHash && intent.fillTimestamp && intent.fillChainId) {
    timeline.push({
      phase: "FILLED",
      txHash: intent.fillTxHash,
      timestamp: intent.fillTimestamp,
      chainId: intent.fillChainId,
      solver: intent.solver || undefined,
    });
  }

  if (intent.finalizeTxHash && intent.finalizeTimestamp && intent.finalizeChainId) {
    timeline.push({
      phase: "FINALIZED",
      txHash: intent.finalizeTxHash,
      timestamp: intent.finalizeTimestamp,
      chainId: intent.finalizeChainId,
    });
  }

  if (intent.refundTxHash && intent.refundTimestamp && intent.refundChainId) {
    timeline.push({
      phase: "REFUNDED",
      txHash: intent.refundTxHash,
      timestamp: intent.refundTimestamp,
      chainId: intent.refundChainId,
    });
  }

  return timeline;
}
