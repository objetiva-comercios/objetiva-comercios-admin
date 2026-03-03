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
  cash: 'Cash',
  card: 'Card',
  transfer: 'Transfer',
  credit: 'Credit',
} as const

export function SaleSheet({ sale, open, onOpenChange }: SaleSheetProps) {
  if (!sale) return null

  const statusLabel =
    sale.status === 'partial_refund'
      ? 'Partial Refund'
      : sale.status.charAt(0).toUpperCase() + sale.status.slice(1)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Sale {sale.saleNumber}</SheetTitle>
          <SheetDescription>
            <Badge variant={statusVariants[sale.status]}>{statusLabel}</Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Customer Information */}
          <div>
            <h3 className="text-sm font-medium mb-2">Customer</h3>
            <div className="space-y-1">
              <p className="text-sm font-medium">{sale.customerName}</p>
              <p className="text-sm text-muted-foreground">{sale.customerEmail}</p>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h3 className="text-sm font-medium mb-3">Items</h3>
            <div className="space-y-3">
              {sale.items.map(item => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="text-sm font-medium">{formatCurrency(item.total)}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div>
            <h3 className="text-sm font-medium mb-3">Totals</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm font-medium">{formatCurrency(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tax</span>
                <span className="text-sm font-medium">{formatCurrency(sale.tax)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Discount</span>
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
            <h3 className="text-sm font-medium mb-2">Payment Method</h3>
            <p className="text-sm">{paymentMethodLabels[sale.paymentMethod]}</p>
          </div>

          {/* Notes */}
          {sale.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground">{sale.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Timestamp */}
          <div>
            <h3 className="text-sm font-medium mb-2">Created</h3>
            <p className="text-sm">{format(new Date(sale.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
