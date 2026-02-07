export function IntentRowSkeleton() {
  return (
    <div className="animate-pulse px-5 py-4">
      {/* Top row: status dot, type, separator, hash, badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <div className="h-4 w-16 rounded bg-white/10" />
          <div className="h-4 w-px bg-white/5" />
          <div className="h-4 w-24 rounded bg-white/10" />
        </div>
        <div className="h-5 w-16 rounded bg-white/10" />
      </div>

      {/* Bottom row: chain flow, timestamp */}
      <div className="mt-1.5 flex items-center justify-between">
        <div className="h-3 w-40 rounded bg-white/5" />
        <div className="h-3 w-20 rounded bg-white/5" />
      </div>
    </div>
  );
}
