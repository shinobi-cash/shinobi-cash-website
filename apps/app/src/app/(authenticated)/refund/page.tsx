"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, useWalletClient, useSwitchChain } from "wagmi";
import { RefundPreviewScreen } from "@/components/screens/RefundPreviewScreen";
import { RefundTimelineScreen } from "@/components/screens/RefundTimelineScreen";
import { useScreenNavigation } from "@/hooks/useScreenNavigation";
import { useRefundController } from "@/hooks/useRefundController";
import { RefundController, RefundSelectors } from "@/controllers/RefundController";
import { POOL_CHAIN_ID } from "@/config/chains";
import type { RefundType } from "@/utils/refund";
import type { WalletClient, Account, Transport, Chain } from "viem";

type RefundScreen = "preview" | "timeline";

export default function RefundPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { chainId: walletChainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const screens = useScreenNavigation<RefundScreen>();
  const state = useRefundController();

  // Capture intent data before status transitions (intent becomes null after "ready")
  const [timelineData, setTimelineData] = useState<{
    refundType: RefundType;
    chainId: number;
    amount: string;
  } | null>(null);

  const orderIdParam = searchParams.get("orderId");

  // Set orderId from URL and auto-prepare on mount
  useEffect(() => {
    if (orderIdParam) {
      RefundController.setOrderId(orderIdParam);
      RefundController.prepare();
    }
  }, [orderIdParam]);

  // Handle confirm from preview
  const handleConfirm = async () => {
    // Ensure intent is prepared (may already be ready from auto-prepare)
    if (RefundController.state.state.status !== "ready") {
      await RefundController.prepare();
    }

    // Check if prepare succeeded
    if (RefundController.state.state.status !== "ready") return;

    const currentIntent = RefundSelectors.getIntent();
    const currentRefundType = RefundSelectors.getRefundType();
    if (!currentIntent || !currentRefundType) return;

    // Capture data for timeline before status transitions away from "ready"
    setTimelineData({
      refundType: currentRefundType,
      chainId: currentRefundType === "deposit"
        ? Number(currentIntent.originChainId)
        : POOL_CHAIN_ID,
      amount: currentIntent.inputAmount,
    });

    screens.navigate("timeline");

    if (currentRefundType === "deposit") {
      if (!walletClient) return;

      // Switch to origin chain if needed
      const requiredChainId = Number(currentIntent.originChainId);
      if (walletChainId !== requiredChainId) {
        try {
          await switchChainAsync({ chainId: requiredChainId });
        } catch {
          return; // User rejected chain switch
        }
      }

      await RefundController.submit(walletClient as WalletClient<Transport, Chain, Account>);
    } else {
      await RefundController.submit();
    }
  };

  const handleTimelineClose = () => {
    RefundController.reset();
    router.push("/activity");
  };

  const handleBack = () => {
    RefundController.reset();
    router.back();
  };

  // Derive display values
  const txHash =
    state.state.status === "confirmed" || state.state.status === "confirming"
      ? state.state.txHash
      : null;

  const hasError = state.state.status === "error";
  const error = state.state.status === "error" ? state.state.error : state.lastError;

  const intent = RefundSelectors.getIntent();
  const refundType = RefundSelectors.getRefundType();

  // Timeline screen
  if (screens.is("timeline") && timelineData) {
    return (
      <RefundTimelineScreen
        amount={timelineData.amount}
        status={state.state.status}
        refundType={timelineData.refundType}
        chainId={timelineData.chainId}
        txHash={txHash}
        error={error}
        onClose={handleTimelineClose}
      />
    );
  }

  // Loading state while fetching intent
  if (state.state.status === "fetching") {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
          <p className="text-neutral-400">Loading intent data…</p>
        </div>
      </div>
    );
  }

  // Error loading intent
  if (hasError && !intent) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <p className="text-neutral-400">{error?.message ?? "Failed to load intent"}</p>
          <button
            onClick={() => router.back()}
            className="text-blue-400 hover:text-blue-300"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  // No orderId or intent not ready
  if (!intent || !refundType) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <p className="text-neutral-400">No refundable intent found.</p>
          <button
            onClick={() => router.push("/activity")}
            className="text-blue-400 hover:text-blue-300"
          >
            Go to Activity
          </button>
        </div>
      </div>
    );
  }

  // Preview screen
  return (
    <RefundPreviewScreen
      onBack={handleBack}
      onConfirm={handleConfirm}
      intent={intent}
      refundType={refundType}
      isProcessing={state.isInProgress}
    />
  );
}
