'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import type { LowStockItem } from '@/types/dashboard'
import { ProductSheet } from '@/components/tables/products/product-sheet'
import { fetchProductById } from '@/lib/api.client'
import type { Product } from '@/types/product'

interface LowStockAlertsProps {
  items: LowStockItem[]
}

export function LowStockAlerts({ items }: LowStockAlertsProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleItemClick = async (productId: number) => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const product = await fetchProductById(productId)
      setSelectedProduct(product)
      setSheetOpen(true)
    } catch (error) {
      console.error('Failed to load product:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertas de stock bajo</CardTitle>
          <CardDescription>Productos que requieren atención</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">Sin productos con stock bajo</p>
            <p className="text-xs text-muted-foreground">
              Todos los niveles de inventario están bien
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Alertas de stock bajo</CardTitle>
          <CardDescription>Productos que requieren atención</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.slice(0, 5).map(item => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item.productId)}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">Cantidad: {item.quantity}</p>
                  </div>
                </div>
                <Badge variant={item.status === 'out_of_stock' ? 'destructive' : 'secondary'}>
                  {item.status === 'out_of_stock' ? 'Sin stock' : 'Stock bajo'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <ProductSheet product={selectedProduct} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
