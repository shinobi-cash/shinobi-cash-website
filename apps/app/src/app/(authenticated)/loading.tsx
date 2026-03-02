import { Loader2 } from "lucide-react";

/**
 * Loading skeleton for authenticated route segments.
 * Shown automatically by Next.js while page content is loading.
 */
export default function AuthenticatedLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
    </div>
  );
}
