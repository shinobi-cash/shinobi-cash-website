import { Suspense } from "react";
import { IntentExplorer } from "@/components/intent/IntentExplorer";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Intent Explorer | Shinobi Cash",
  description: "Track cross-chain deposit and withdrawal intents on Shinobi Cash privacy pools",
};

function IntentExplorerFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-neutral-950">
      <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
    </div>
  );
}

export default function IntentsPage() {
  return (
    <Suspense fallback={<IntentExplorerFallback />}>
      <IntentExplorer />
    </Suspense>
  );
}
