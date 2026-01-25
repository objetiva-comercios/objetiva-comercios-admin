import { Skeleton } from '@/components/ui/skeleton'

export default function PurchasesLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-9 w-[180px]" />
        <Skeleton className="h-5 w-[350px] mt-2" />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <div className="rounded-md border">
          <div className="p-4">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-3 p-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-[200px]" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-[100px]" />
            <Skeleton className="h-8 w-[70px]" />
          </div>
        </div>
      </div>
    </div>
  )
}
