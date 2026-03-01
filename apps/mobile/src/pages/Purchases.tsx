import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { FilterChips } from '../components/ui/FilterChips'
import { BottomSheet } from '../components/ui/BottomSheet'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useInfiniteList } from '../hooks/useInfiniteList'
import type { Purchase } from '../types'

const STATUS_FILTERS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Ordered', value: 'ordered' },
  { label: 'Received', value: 'received' },
  { label: 'Cancelled', value: 'cancelled' },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
}

function formatDate(iso: string | null) {
  if (!iso) return 'Not received'
  return new Date(iso).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function deliveryIndicator(purchase: Purchase): { label: string; className: string } {
  if (purchase.receivedAt) {
    const received = new Date(purchase.receivedAt)
    const expected = new Date(purchase.expectedDelivery)
    if (received <= expected) {
      return { label: 'On time', className: 'text-green-600 dark:text-green-400' }
    }
    return { label: 'Late', className: 'text-destructive' }
  }
  const now = new Date()
  const expected = new Date(purchase.expectedDelivery)
  if (now > expected) {
    return { label: 'Overdue', className: 'text-destructive' }
  }
  return { label: 'Expected', className: 'text-muted-foreground' }
}

export function Purchases() {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)

  const params: Record<string, string> = {}
  if (selectedStatus) params['status'] = selectedStatus
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteList<Purchase>('/purchases', params)

  const purchases = data?.pages.flatMap(p => p.data) ?? []

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
        ) : purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">No purchases found</p>
          </div>
        ) : (
          purchases.map(purchase => {
            const indicator = deliveryIndicator(purchase)
            return (
              <Card key={purchase.id} onClick={() => setSelectedPurchase(purchase)}>
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-foreground">{purchase.purchaseNumber}</span>
                  <StatusBadge status={purchase.status} />
                </div>
                <p className="text-sm text-muted-foreground mb-2">{purchase.supplierName}</p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    {formatCurrency(purchase.total)}
                  </span>
                  <span className={`text-xs ${indicator.className}`}>
                    {indicator.label}: {formatDate(purchase.expectedDelivery)}
                  </span>
                </div>
              </Card>
            )
          })
        )}

        {/* Infinite scroll — loading more */}
        {isFetchingNextPage && <CardSkeleton />}

        {/* Invisible sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1" />
      </div>

      {/* Purchase detail bottom sheet */}
      <BottomSheet
        open={selectedPurchase !== null}
        onClose={() => setSelectedPurchase(null)}
        title={selectedPurchase?.purchaseNumber ?? ''}
      >
        {selectedPurchase && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusBadge status={selectedPurchase.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Supplier</p>
                <p className="text-sm font-medium text-foreground">
                  {selectedPurchase.supplierName}
                </p>
              </div>
              {selectedPurchase.supplierContact && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="text-sm text-foreground">{selectedPurchase.supplierContact}</p>
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Items</p>
              <div className="flex flex-col gap-2">
                {selectedPurchase.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1 mr-2">
                      <span className="text-foreground">{item.productName}</span>
                      <span className="text-muted-foreground ml-2">
                        {item.quantity} x {formatCurrency(item.unitCost)}
                      </span>
                    </div>
                    <span className="text-foreground font-medium">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatCurrency(selectedPurchase.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground">{formatCurrency(selectedPurchase.tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-foreground">{formatCurrency(selectedPurchase.shipping)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">{formatCurrency(selectedPurchase.total)}</span>
              </div>
            </div>

            {/* Delivery tracking */}
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <p className="text-xs font-medium text-foreground">Delivery Tracking</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expected</span>
                <span className="text-foreground">
                  {formatDate(selectedPurchase.expectedDelivery)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Received</span>
                {selectedPurchase.receivedAt ? (
                  <span
                    className={
                      new Date(selectedPurchase.receivedAt) <=
                      new Date(selectedPurchase.expectedDelivery)
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-destructive'
                    }
                  >
                    {formatDate(selectedPurchase.receivedAt)}
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">Not received</span>
                )}
              </div>
            </div>

            {selectedPurchase.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-foreground">{selectedPurchase.notes}</p>
              </div>
            )}

            {/* Order date */}
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Order Date</p>
              <p className="text-sm text-foreground">{formatDate(selectedPurchase.createdAt)}</p>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
