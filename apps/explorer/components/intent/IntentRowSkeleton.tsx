export function IntentRowSkeleton() {
  return (
    <div className="flex animate-pulse items-center justify-between gap-4 px-5 py-4">
      {/* Left */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <div className="h-4 w-32 rounded bg-white/10" />
          <div className="h-4 w-16 rounded bg-white/10" />
        </div>

        <div className="mt-1 flex items-center gap-2">
          <div className="h-3 w-24 rounded bg-white/5" />
          <div className="h-3 w-20 rounded bg-white/5" />
        </div>

        <div className="mt-1">
          <div className="h-3 w-28 rounded bg-white/5" />
        </div>
      </div>

      {/* Right */}
      <div className="shrink-0 text-right">
        <div className="h-4 w-20 rounded bg-white/10" />
        <div className="mt-1 h-3 w-16 rounded bg-white/5" />
      </div>
    </div>
  );
}
