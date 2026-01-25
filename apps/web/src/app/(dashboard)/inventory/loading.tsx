export default function InventoryLoading() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-9 w-32 bg-muted animate-pulse rounded" />
        <div className="h-5 w-64 bg-muted animate-pulse rounded" />
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-md border">
        {/* Table Header */}
        <div className="border-b p-4">
          <div className="flex space-x-4">
            <div className="h-6 w-24 bg-muted animate-pulse rounded" />
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            <div className="h-6 w-24 bg-muted animate-pulse rounded" />
            <div className="h-6 w-20 bg-muted animate-pulse rounded" />
            <div className="h-6 w-20 bg-muted animate-pulse rounded" />
            <div className="h-6 w-20 bg-muted animate-pulse rounded" />
            <div className="h-6 w-20 bg-muted animate-pulse rounded" />
            <div className="h-6 w-28 bg-muted animate-pulse rounded" />
          </div>
        </div>

        {/* Table Rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-b p-4">
            <div className="flex space-x-4">
              <div className="h-5 w-24 bg-muted animate-pulse rounded" />
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
              <div className="h-5 w-24 bg-muted animate-pulse rounded" />
              <div className="h-5 w-20 bg-muted animate-pulse rounded" />
              <div className="h-5 w-20 bg-muted animate-pulse rounded" />
              <div className="h-5 w-20 bg-muted animate-pulse rounded" />
              <div className="h-5 w-20 bg-muted animate-pulse rounded" />
              <div className="h-5 w-28 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between px-2">
        <div className="h-5 w-40 bg-muted animate-pulse rounded" />
        <div className="flex items-center space-x-6">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-5 w-24 bg-muted animate-pulse rounded" />
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-muted animate-pulse rounded" />
            <div className="h-8 w-8 bg-muted animate-pulse rounded" />
            <div className="h-8 w-8 bg-muted animate-pulse rounded" />
            <div className="h-8 w-8 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
