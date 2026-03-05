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
import type { Sale } from '@/types/sale'

interface SaleSheetProps {
  sale: Sale | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusVariants = {
  completed: 'default',
  refunded: 'destructive',
  partial_refund: 'outline',
} as const

const paymentMethodLabels = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Crédito',
} as const

export function SaleSheet({ sale, open, onOpenChange }: SaleSheetProps) {
  if (!sale) return null

  const statusLabels: Record<string, string> = {
    completed: 'Completada',
    refunded: 'Reembolsada',
    partial_refund: 'Reembolso parcial',
  }
  const statusLabel = statusLabels[sale.status] ?? sale.status

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Venta {sale.saleNumber}</SheetTitle>
          <SheetDescription>
            <Badge variant={statusVariants[sale.status]}>{statusLabel}</Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Customer Information */}
          <div>
            <h3 className="text-sm font-medium mb-2">Cliente</h3>
            <div className="space-y-1">
              <p className="text-sm font-medium">{sale.customerName}</p>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h3 className="text-sm font-medium mb-3">Artículos</h3>
            <div className="space-y-3">
              {sale.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin artículos</p>
              ) : (
                sale.items.map(item => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.articuloNombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} x {formatCurrency(item.price)}
                      </p>
                    </div>
                    <p className="text-sm font-medium">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div>
            <h3 className="text-sm font-medium mb-3">Totales</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm font-medium">{formatCurrency(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Impuestos</span>
                <span className="text-sm font-medium">{formatCurrency(sale.tax)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Descuento</span>
                  <span className="text-sm font-medium text-green-600">
                    -{formatCurrency(sale.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-sm font-semibold">{formatCurrency(sale.total)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Method */}
          <div>
            <h3 className="text-sm font-medium mb-2">Método de pago</h3>
            <p className="text-sm">{paymentMethodLabels[sale.paymentMethod]}</p>
          </div>

          <Separator />

          {/* Timestamp */}
          <div>
            <h3 className="text-sm font-medium mb-2">Fecha de creación</h3>
            <p className="text-sm">{format(new Date(sale.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
