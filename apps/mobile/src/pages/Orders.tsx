import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { formatCurrency, formatDate } from '@objetiva/utils'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { FilterChips } from '../components/ui/FilterChips'
import { BottomSheet } from '../components/ui/BottomSheet'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useInfiniteList } from '../hooks/useInfiniteList'
import type { Order } from '../types'

const STATUS_FILTERS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
]

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

export function Orders() {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const params: Record<string, string> = {}
  if (selectedStatus) params['status'] = selectedStatus
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteList<Order>('/orders', params)

  const orders = data?.pages.flatMap(p => p.data) ?? []

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
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">No orders found</p>
          </div>
        ) : (
          orders.map(order => (
            <Card key={order.id} onClick={() => setSelectedOrder(order)}>
              <div className="flex items-start justify-between mb-1">
                <span className="font-medium text-foreground">{order.orderNumber}</span>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-sm text-foreground/80 mb-2">{order.customerName}</p>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{formatCurrency(order.total)}</span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(order.createdAt)}
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

      {/* Order detail bottom sheet */}
      <BottomSheet
        open={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder?.orderNumber ?? ''}
      >
        {selectedOrder && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusBadge status={selectedOrder.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="text-sm font-medium text-foreground">{selectedOrder.customerName}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground">{selectedOrder.customerEmail}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Shipping Address</p>
                <p className="text-sm text-foreground">{selectedOrder.shippingAddress}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Items</p>
              <div className="flex flex-col gap-2">
                {selectedOrder.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1 mr-2">
                      <span className="text-foreground">{item.articuloNombre}</span>
                      <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                    </div>
                    <span className="text-foreground font-medium">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatCurrency(selectedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground">{formatCurrency(selectedOrder.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm text-foreground">{formatDate(selectedOrder.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Updated</p>
                <p className="text-sm text-foreground">{formatDate(selectedOrder.updatedAt)}</p>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
