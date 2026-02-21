export default function DossierLoading() {
  return (
    <div className="max-w-5xl p-6 lg:p-8">
      {/* Back link skeleton */}
      <div className="mb-6 h-4 w-32 animate-shimmer rounded" />

      {/* Header skeleton */}
      <div className="mb-8">
        <div className="mb-2 flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-8 w-56 animate-shimmer rounded" />
            <div className="h-4 w-40 animate-shimmer rounded" />
          </div>
          <div className="h-6 w-24 animate-shimmer rounded-full" />
        </div>
        <div className="mt-2 flex gap-4">
          <div className="h-3 w-28 animate-shimmer rounded" />
          <div className="h-3 w-36 animate-shimmer rounded" />
        </div>
      </div>

      {/* Score section skeletons */}
      <div className="grid gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            className="rounded-xl border bg-card/50 p-6"
            key={`section-${i}`}
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="h-5 w-5 animate-shimmer rounded" />
              <div className="h-5 w-40 animate-shimmer rounded" />
            </div>
            <div className="mb-4 grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  className="rounded-lg bg-secondary/50 p-3"
                  key={`stat-${i}-${j}`}
                >
                  <div className="mx-auto mb-2 h-8 w-12 animate-shimmer rounded" />
                  <div className="mx-auto h-3 w-20 animate-shimmer rounded" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full animate-shimmer rounded" />
              <div className="h-4 w-3/4 animate-shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
