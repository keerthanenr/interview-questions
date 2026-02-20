export default function DossierLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Back link skeleton */}
      <div className="h-4 w-32 rounded animate-shimmer mb-6" />

      {/* Header skeleton */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-2">
          <div className="space-y-2">
            <div className="h-8 w-56 rounded animate-shimmer" />
            <div className="h-4 w-40 rounded animate-shimmer" />
          </div>
          <div className="h-6 w-24 rounded-full animate-shimmer" />
        </div>
        <div className="flex gap-4 mt-2">
          <div className="h-3 w-28 rounded animate-shimmer" />
          <div className="h-3 w-36 rounded animate-shimmer" />
        </div>
      </div>

      {/* Score section skeletons */}
      <div className="grid gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`section-${i}`}
            className="rounded-xl border bg-card/50 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded animate-shimmer" />
              <div className="h-5 w-40 rounded animate-shimmer" />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  key={`stat-${i}-${j}`}
                  className="rounded-lg bg-secondary/50 p-3"
                >
                  <div className="h-8 w-12 mx-auto rounded animate-shimmer mb-2" />
                  <div className="h-3 w-20 mx-auto rounded animate-shimmer" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded animate-shimmer" />
              <div className="h-4 w-3/4 rounded animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
