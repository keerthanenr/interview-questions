export default function DashboardLoading() {
  return (
    <div className="p-6 lg:p-8">
      {/* Header skeleton */}
      <div className="mb-8 flex items-center justify-between">
        <div className="h-8 w-48 animate-shimmer rounded-lg" />
        <div className="h-10 w-40 animate-shimmer rounded-lg" />
      </div>

      {/* Assessment card skeletons */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            className="overflow-hidden rounded-xl border bg-card/50"
            key={`skeleton-${i}`}
          >
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-36 animate-shimmer rounded" />
                  <div className="h-5 w-16 animate-shimmer rounded-full" />
                </div>
                <div className="flex gap-4">
                  <div className="h-3 w-24 animate-shimmer rounded" />
                  <div className="h-3 w-20 animate-shimmer rounded" />
                  <div className="h-3 w-20 animate-shimmer rounded" />
                </div>
              </div>
              <div className="h-9 w-28 animate-shimmer rounded-lg" />
            </div>
            {/* Candidate rows */}
            <div className="divide-y border-t">
              {Array.from({ length: 2 }).map((_, j) => (
                <div
                  className="flex items-center gap-3 px-5 py-3"
                  key={`candidate-${i}-${j}`}
                >
                  <div className="h-7 w-7 animate-shimmer rounded-full" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-32 animate-shimmer rounded" />
                    <div className="h-3 w-48 animate-shimmer rounded" />
                  </div>
                  <div className="h-5 w-20 animate-shimmer rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
