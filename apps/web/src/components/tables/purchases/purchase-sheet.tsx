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
import { formatCurrency } from '@objetiva/utils'
import type { Purchase } from '@/types/purchase'

interface PurchaseSheetProps {
  purchase: Purchase | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusVariants = {
  draft: 'secondary',
  ordered: 'default',
  received: 'default',
  cancelled: 'destructive',
} as const

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  ordered: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  received: 'bg-green-100 text-green-800 hover:bg-green-100',
  cancelled: 'bg-red-100 text-red-800 hover:bg-red-100',
} as const

export function PurchaseSheet({ purchase, open, onOpenChange }: PurchaseSheetProps) {
  if (!purchase) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Compra {purchase.purchaseNumber}</SheetTitle>
          <SheetDescription>
            <Badge
              variant={statusVariants[purchase.status]}
              className={statusColors[purchase.status]}
            >
              {{
                draft: 'Borrador',
                ordered: 'Pedida',
                received: 'Recibida',
                cancelled: 'Cancelada',
              }[purchase.status] ?? purchase.status}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Supplier Information */}
          <div>
            <h3 className="text-sm font-medium mb-2">Proveedor</h3>
            <div className="space-y-1">
              <p className="text-sm font-medium">{purchase.supplierName}</p>
              <p className="text-sm text-muted-foreground">{purchase.supplierContact}</p>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h3 className="text-sm font-medium mb-3">Artículos</h3>
            <div className="space-y-3">
              {purchase.items.map(item => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.articuloNombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} x {formatCurrency(item.unitCost)}
                    </p>
                  </div>
                  <p className="text-sm font-medium">{formatCurrency(item.subtotal)}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div>
            <h3 className="text-sm font-medium mb-3">Totales</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm font-medium">{formatCurrency(purchase.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Impuestos</span>
                <span className="text-sm font-medium">{formatCurrency(purchase.tax)}</span>
              </div>
              {purchase.shipping > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Envío</span>
                  <span className="text-sm font-medium">{formatCurrency(purchase.shipping)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-sm font-semibold">{formatCurrency(purchase.total)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Delivery Information */}
          <div>
            <h3 className="text-sm font-medium mb-3">Entrega</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground block">Entrega estimada</span>
                <span className="text-sm">
                  {format(new Date(purchase.expectedDelivery), 'MMM d, yyyy')}
                </span>
              </div>
              {purchase.receivedAt && (
                <div>
                  <span className="text-sm text-muted-foreground block">Recibido</span>
                  <span className="text-sm">
                    {format(new Date(purchase.receivedAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {purchase.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2">Notas</h3>
                <p className="text-sm text-muted-foreground">{purchase.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Timestamp */}
          <div>
            <h3 className="text-sm font-medium mb-2">Fecha de creación</h3>
            <p className="text-sm">
              {format(new Date(purchase.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
