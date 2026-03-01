import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { FilterChips } from '../components/ui/FilterChips'
import { BottomSheet } from '../components/ui/BottomSheet'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useInfiniteList } from '../hooks/useInfiniteList'
import type { Sale } from '../types'

const STATUS_FILTERS = [
  { label: 'Completed', value: 'completed' },
  { label: 'Refunded', value: 'refunded' },
  { label: 'Partial Refund', value: 'partial_refund' },
]

const PAYMENT_METHOD_LABEL: Record<Sale['paymentMethod'], string> = {
  cash: 'Cash',
  card: 'Card',
  transfer: 'Transfer',
  credit: 'Credit',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function Sales() {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)

  const params: Record<string, string> = {}
  if (selectedStatus) params['status'] = selectedStatus
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteList<Sale>(
    '/sales',
    params
  )

  const sales = data?.pages.flatMap(p => p.data) ?? []

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
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">No sales found</p>
          </div>
        ) : (
          sales.map(sale => (
            <Card key={sale.id} onClick={() => setSelectedSale(sale)}>
              <div className="flex items-start justify-between mb-1">
                <span className="font-medium text-foreground">{sale.saleNumber}</span>
                <StatusBadge status={sale.status} />
              </div>
              <p className="text-sm text-muted-foreground mb-2">{sale.customerName}</p>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{formatCurrency(sale.total)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-muted text-muted-foreground rounded px-2 py-0.5 capitalize">
                    {PAYMENT_METHOD_LABEL[sale.paymentMethod]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(sale.createdAt)}
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}

        {/* Infinite scroll — loading more */}
        {isFetchingNextPage && <CardSkeleton />}

        {/* Invisible sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1" />
      </div>

      {/* Sale detail bottom sheet */}
      <BottomSheet
        open={selectedSale !== null}
        onClose={() => setSelectedSale(null)}
        title={selectedSale?.saleNumber ?? ''}
      >
        {selectedSale && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusBadge status={selectedSale.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Method</p>
                <p className="text-sm font-medium text-foreground capitalize">
                  {PAYMENT_METHOD_LABEL[selectedSale.paymentMethod]}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="text-sm font-medium text-foreground">{selectedSale.customerName}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground">{selectedSale.customerEmail}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Items</p>
              <div className="flex flex-col gap-2">
                {selectedSale.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1 mr-2">
                      <span className="text-foreground">{item.productName}</span>
                      <span className="text-muted-foreground ml-2">
                        {item.quantity} x {formatCurrency(item.unitPrice)}
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
                <span className="text-foreground">{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground">{formatCurrency(selectedSale.tax)}</span>
              </div>
              {selectedSale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-destructive">-{formatCurrency(selectedSale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">{formatCurrency(selectedSale.total)}</span>
              </div>
            </div>

            {selectedSale.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-foreground">{selectedSale.notes}</p>
              </div>
            )}

            {/* Date */}
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm text-foreground">{formatDate(selectedSale.createdAt)}</p>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
