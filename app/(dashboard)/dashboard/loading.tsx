export default function DashboardLoading() {
  return (
    <div className="p-6 lg:p-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 w-48 rounded-lg animate-shimmer" />
        <div className="h-10 w-40 rounded-lg animate-shimmer" />
      </div>

      {/* Assessment card skeletons */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`skeleton-${i}`}
            className="rounded-xl border bg-card/50 overflow-hidden"
          >
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-36 rounded animate-shimmer" />
                  <div className="h-5 w-16 rounded-full animate-shimmer" />
                </div>
                <div className="flex gap-4">
                  <div className="h-3 w-24 rounded animate-shimmer" />
                  <div className="h-3 w-20 rounded animate-shimmer" />
                  <div className="h-3 w-20 rounded animate-shimmer" />
                </div>
              </div>
              <div className="h-9 w-28 rounded-lg animate-shimmer" />
            </div>
            {/* Candidate rows */}
            <div className="border-t divide-y">
              {Array.from({ length: 2 }).map((_, j) => (
                <div
                  key={`candidate-${i}-${j}`}
                  className="px-5 py-3 flex items-center gap-3"
                >
                  <div className="w-7 h-7 rounded-full animate-shimmer" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-32 rounded animate-shimmer" />
                    <div className="h-3 w-48 rounded animate-shimmer" />
                  </div>
                  <div className="h-5 w-20 rounded-full animate-shimmer" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
