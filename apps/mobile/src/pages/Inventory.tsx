import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { formatDate } from '@objetiva/utils'
import { cn } from '@objetiva/ui'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { FilterChips } from '../components/ui/FilterChips'
import { BottomSheet } from '../components/ui/BottomSheet'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useInfiniteList } from '../hooks/useInfiniteList'
import type { Inventory as InventoryItem } from '../types'

const STATUS_FILTERS = [
  { label: 'In Stock', value: 'in_stock' },
  { label: 'Low Stock', value: 'low_stock' },
  { label: 'Out of Stock', value: 'out_of_stock' },
]

const QUANTITY_COLOR: Record<string, string> = {
  in_stock: 'text-green-600 dark:text-green-400',
  low_stock: 'text-yellow-600 dark:text-yellow-400',
  out_of_stock: 'text-red-600 dark:text-red-400',
}

export function Inventory() {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  const params: Record<string, string> = {}
  if (selectedStatus) params['status'] = selectedStatus
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteList<InventoryItem>('/inventory', params)

  const items = data?.pages.flatMap(p => p.data) ?? []

  const { ref: sentinelRef, inView } = useInView()

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className="flex flex-col gap-0 overflow-y-auto">
      {/* Filter chips */}
      <div className="sticky top-0 bg-background px-4 pt-4 pb-2 z-10">
        <FilterChips
          filters={STATUS_FILTERS}
          selected={selectedStatus}
          onSelect={setSelectedStatus}
        />
      </div>

      {/* Card list */}
      <div className="flex flex-col gap-3 p-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">No inventory items found</p>
          </div>
        ) : (
          items.map(item => (
            <Card key={item.id} onClick={() => setSelectedItem(item)}>
              <div className="flex items-start justify-between mb-1">
                <span className="font-medium text-foreground leading-snug flex-1 mr-2">
                  {item.productName}
                </span>
                <StatusBadge status={item.status} />
              </div>
              <p className="text-xs text-muted-foreground mb-2">{item.sku}</p>
              <div className="flex items-center justify-between">
                <span className={cn('font-semibold text-lg', QUANTITY_COLOR[item.status])}>
                  {item.quantity}
                  <span className="text-xs font-normal text-muted-foreground ml-1">units</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.availableQuantity} available
                </span>
              </div>
            </Card>
          ))
        )}

        {/* Infinite scroll — loading more */}
        {isFetchingNextPage && <CardSkeleton />}

        {/* Invisible sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1" />
      </div>

      {/* Inventory detail bottom sheet */}
      <BottomSheet
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.productName ?? ''}
      >
        {selectedItem && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">SKU</p>
                <p className="text-sm font-medium text-foreground">{selectedItem.sku}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusBadge status={selectedItem.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Quantity</p>
                <p className={cn('text-sm font-semibold', QUANTITY_COLOR[selectedItem.status])}>
                  {selectedItem.quantity}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reserved</p>
                <p className="text-sm font-medium text-foreground">
                  {selectedItem.reservedQuantity}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-sm font-medium text-foreground">
                  {selectedItem.availableQuantity}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reorder Point</p>
                <p className="text-sm font-medium text-foreground">{selectedItem.reorderPoint}</p>
              </div>
            </div>

            {/* Reorder alert */}
            {selectedItem.quantity <= selectedItem.reorderPoint && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                  Reorder Alert
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-0.5">
                  Stock ({selectedItem.quantity}) is at or below reorder point (
                  {selectedItem.reorderPoint})
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Last Restocked</p>
                <p className="text-sm text-foreground">{formatDate(selectedItem.lastRestocked)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm text-foreground">{formatDate(selectedItem.updatedAt)}</p>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
