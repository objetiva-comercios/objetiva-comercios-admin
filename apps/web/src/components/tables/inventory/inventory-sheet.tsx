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

  const statusLabel = inventory.status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

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
            <h3 className="text-sm font-medium mb-2">Status</h3>
            <Badge className={statusColors[inventory.status]}>{statusLabel}</Badge>
          </div>

          <Separator />

          {/* Quantity Breakdown */}
          <div>
            <h3 className="text-sm font-medium mb-3">Inventory Levels</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Quantity</span>
                <span className="text-sm font-medium">{inventory.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Reserved</span>
                <span className="text-sm font-medium">{inventory.reservedQuantity}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm font-semibold">Available</span>
                <span className="text-sm font-semibold">{inventory.availableQuantity}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Reorder Point */}
          <div>
            <h3 className="text-sm font-medium mb-3">Reorder Point</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Reorder Level</span>
                <span className="text-sm font-medium">{inventory.reorderPoint}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Current Available</span>
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
                  Stock is at or below reorder point. Consider restocking.
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div>
            <h3 className="text-sm font-medium mb-3">History</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground block">Last Restocked</span>
                <span className="text-sm">
                  {inventory.lastRestocked
                    ? format(new Date(inventory.lastRestocked), "MMM d, yyyy 'at' h:mm a")
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Product Link */}
          <div>
            <h3 className="text-sm font-medium mb-2">Related</h3>
            <p className="text-sm text-muted-foreground">
              Product ID: <span className="font-mono text-xs">{inventory.productId}</span>
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
