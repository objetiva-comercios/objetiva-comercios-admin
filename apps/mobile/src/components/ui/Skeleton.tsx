import { cn } from '@objetiva/ui'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('bg-muted animate-pulse rounded', className)} />
}

export function CardSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      {/* Name line */}
      <div className="flex items-start justify-between mb-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      {/* Secondary line (SKU / order number) */}
      <Skeleton className="h-3 w-1/3 mb-3" />
      {/* Bottom row — price + metadata */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}
