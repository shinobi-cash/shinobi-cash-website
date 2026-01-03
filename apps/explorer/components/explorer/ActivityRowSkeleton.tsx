export function ActivityRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-white/10" />
        <div className="h-2 w-20 rounded bg-white/5" />
      </div>

      <div className="h-4 w-20 rounded bg-white/10" />
    </div>
  );
}
