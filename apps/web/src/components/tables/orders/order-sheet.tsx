'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
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
import type { Order } from '@/types/order'

interface OrderSheetProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusVariants = {
  pending: 'secondary',
  processing: 'default',
  shipped: 'outline',
  delivered: 'default',
  cancelled: 'destructive',
} as const

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  processing: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  shipped: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  delivered: 'bg-green-100 text-green-800 hover:bg-green-100',
  cancelled: 'bg-red-100 text-red-800 hover:bg-red-100',
} as const

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  processing: 'En proceso',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export function OrderSheet({ order, open, onOpenChange }: OrderSheetProps) {
  if (!order) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Pedido {order.orderNumber}</SheetTitle>
          <SheetDescription>
            <Badge variant={statusVariants[order.status]} className={statusColors[order.status]}>
              {statusLabels[order.status] ?? order.status}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Customer Information */}
          <div>
            <h3 className="text-sm font-medium mb-2">Cliente</h3>
            <div className="space-y-1">
              <p className="text-sm font-medium">{order.customerName}</p>
              <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          <div>
            <h3 className="text-sm font-medium mb-3">Artículos</h3>
            <div className="space-y-3">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.articuloNombre}</p>
                    <p className="text-xs text-muted-foreground">Cant.: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.price)} c/u
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Order Total */}
          <div>
            <h3 className="text-sm font-medium mb-3">Total del pedido</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm font-medium">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Impuestos</span>
                <span className="text-sm font-medium">{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-sm font-semibold">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Shipping Address */}
          <div>
            <h3 className="text-sm font-medium mb-2">Dirección de envío</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {order.shippingAddress}
            </p>
          </div>

          <Separator />

          {/* Metadata */}
          <div>
            <h3 className="text-sm font-medium mb-3">Detalle del pedido</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground block">Creado</span>
                <span className="text-sm">
                  {format(new Date(order.createdAt), "d 'de' MMM yyyy, HH:mm", { locale: es })}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block">Última actualización</span>
                <span className="text-sm">
                  {format(new Date(order.updatedAt), "d 'de' MMM yyyy, HH:mm", { locale: es })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
