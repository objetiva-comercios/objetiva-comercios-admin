'use client'

import { format } from 'date-fns'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Inventory } from '@/types/inventory'

interface InventorySheetProps {
  inventory: Inventory | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusColors = {
  in_stock: 'bg-green-100 text-green-800 hover:bg-green-100',
  low_stock: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  out_of_stock: 'bg-red-100 text-red-800 hover:bg-red-100',
} as const

export function InventorySheet({ inventory, open, onOpenChange }: InventorySheetProps) {
  if (!inventory) return null

  const statusLabels: Record<string, string> = {
    in_stock: 'En stock',
    low_stock: 'Stock bajo',
    out_of_stock: 'Sin stock',
  }
  const statusLabel = statusLabels[inventory.status] ?? inventory.status

  const isLowStock = inventory.availableQuantity <= inventory.reorderPoint

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{inventory.productName}</SheetTitle>
          <SheetDescription>SKU: {inventory.sku}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          <div>
            <h3 className="text-sm font-medium mb-2">Estado</h3>
            <Badge className={statusColors[inventory.status]}>{statusLabel}</Badge>
          </div>

          <Separator />

          {/* Quantity Breakdown */}
          <div>
            <h3 className="text-sm font-medium mb-3">Niveles de inventario</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cantidad total</span>
                <span className="text-sm font-medium">{inventory.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Reservado</span>
                <span className="text-sm font-medium">{inventory.reservedQuantity}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm font-semibold">Disponible</span>
                <span className="text-sm font-semibold">{inventory.availableQuantity}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Reorder Point */}
          <div>
            <h3 className="text-sm font-medium mb-3">Punto de reorden</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Nivel de reorden</span>
                <span className="text-sm font-medium">{inventory.reorderPoint}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Disponible actual</span>
                <span
                  className={
                    'text-sm font-medium ' + (isLowStock ? 'text-yellow-600' : 'text-green-600')
                  }
                >
                  {inventory.availableQuantity}
                </span>
              </div>
              {isLowStock && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  El stock está en o por debajo del punto de reorden. Considerá reabastecer.
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div>
            <h3 className="text-sm font-medium mb-3">Historial</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground block">Último restock</span>
                <span className="text-sm">
                  {inventory.lastRestocked
                    ? format(new Date(inventory.lastRestocked), "MMM d, yyyy 'at' h:mm a")
                    : 'Sin datos'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Product Link */}
          <div>
            <h3 className="text-sm font-medium mb-2">Relacionado</h3>
            <p className="text-sm text-muted-foreground">
              ID de producto: <span className="font-mono text-xs">{inventory.productId}</span>
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
