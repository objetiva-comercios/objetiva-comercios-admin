import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { FilterChips } from '../components/ui/FilterChips'
import { BottomSheet } from '../components/ui/BottomSheet'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useInfiniteList } from '../hooks/useInfiniteList'
import type { Product } from '../types'

const STATUS_FILTERS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Discontinued', value: 'discontinued' },
]

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

export function Articles() {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const params: Record<string, string> = {}
  if (selectedStatus) params['status'] = selectedStatus
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteList<Product>('/products', params)

  const products = data?.pages.flatMap(p => p.data) ?? []

  const { ref: sentinelRef, inView } = useInView()

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const profitMargin = (product: Product) => {
    if (product.price === 0) return 0
    return (((product.price - product.cost) / product.price) * 100).toFixed(1)
  }

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
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">No articles found</p>
          </div>
        ) : (
          products.map(product => (
            <Card key={product.id} onClick={() => setSelectedProduct(product)}>
              <div className="flex items-start justify-between mb-1">
                <span className="font-medium text-foreground leading-snug flex-1 mr-2">
                  {product.name}
                </span>
                <StatusBadge status={product.status} />
              </div>
              <p className="text-xs text-muted-foreground mb-2">{product.sku}</p>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-xs text-muted-foreground capitalize">{product.category}</span>
              </div>
            </Card>
          ))
        )}

        {/* Infinite scroll — loading more */}
        {isFetchingNextPage && <CardSkeleton />}

        {/* Invisible sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1" />
      </div>

      {/* Product detail bottom sheet */}
      <BottomSheet
        open={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name ?? ''}
      >
        {selectedProduct && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">SKU</p>
                <p className="text-sm font-medium text-foreground">{selectedProduct.sku}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusBadge status={selectedProduct.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="text-sm font-medium text-foreground capitalize">
                  {selectedProduct.category}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="text-sm font-medium text-foreground">
                  {formatCurrency(selectedProduct.price)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cost</p>
                <p className="text-sm font-medium text-foreground">
                  {formatCurrency(selectedProduct.cost)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profit Margin</p>
                <p className="text-sm font-medium text-foreground">
                  {profitMargin(selectedProduct)}%
                </p>
              </div>
            </div>

            {selectedProduct.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground">{selectedProduct.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm text-foreground">{formatDate(selectedProduct.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Updated</p>
                <p className="text-sm text-foreground">{formatDate(selectedProduct.updatedAt)}</p>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
