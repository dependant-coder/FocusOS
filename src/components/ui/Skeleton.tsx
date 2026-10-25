function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse ${className ?? ''}`} />
  )
}

export function TaskCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3.5 mb-2 flex items-start gap-3">
      <SkeletonBlock className="w-6 h-6 rounded-full flex-shrink-0" />
      <div className="flex-1">
        <SkeletonBlock className="h-4 w-3/4 mb-2" />
        <div className="flex gap-1.5">
          <SkeletonBlock className="h-3 w-16 rounded-full" />
          <SkeletonBlock className="h-3 w-14 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function VaultSkeleton() {
  return (
    <div className="px-4 pt-4 space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border-l-4 border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex-1">
              <SkeletonBlock className="h-4 w-3/4 mb-2" />
              <SkeletonBlock className="h-3 w-1/2" />
            </div>
            <SkeletonBlock className="w-10 h-5 rounded-full flex-shrink-0" />
          </div>
          <div className="flex gap-1.5">
            <SkeletonBlock className="h-5 w-16 rounded-full" />
            <SkeletonBlock className="h-5 w-14 rounded-full" />
            <SkeletonBlock className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DailySkeleton() {
  return (
    <div className="px-4 space-y-2">
      {/* Progress header skeleton */}
      <div className="mb-4 mt-2">
        <SkeletonBlock className="h-3 w-32 mb-2" />
        <SkeletonBlock className="h-1.5 w-full rounded-full" />
      </div>
      {/* Section label */}
      <SkeletonBlock className="h-3 w-28 mb-3" />
      {[1, 2, 3].map(i => <TaskCardSkeleton key={`p${i}`} />)}
      {/* Second section */}
      <SkeletonBlock className="h-3 w-20 mb-3 mt-5" />
      {[1, 2].map(i => <TaskCardSkeleton key={`h${i}`} />)}
    </div>
  )
}
