'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { formatCurrency } from '@objetiva/utils'
import type { RecentOrder } from '@/types/dashboard'
import { OrderSheet } from '@/components/tables/orders/order-sheet'
import { fetchOrderById } from '@/lib/api.client'
import type { Order } from '@/types/order'

interface RecentOrdersProps {
  orders: RecentOrder[]
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleRowClick = async (orderId: number) => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const order = await fetchOrderById(orderId)
      setSelectedOrder(order)
      setSheetOpen(true)
    } catch (error) {
      console.error('Failed to load order:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pedidos recientes</CardTitle>
          <CardDescription>Actividad de pedidos reciente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">Sin pedidos recientes</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pedidos recientes</CardTitle>
          <CardDescription>Actividad de pedidos reciente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.map(order => (
              <div
                key={order.id}
                onClick={() => handleRowClick(order.id)}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{order.customerName}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-medium">{formatCurrency(order.total)}</p>
                  <Badge variant={getStatusVariant(order.status)}>
                    {formatStatus(order.status)}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <OrderSheet order={selectedOrder} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  processing: 'En proceso',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

function formatStatus(status: string): string {
  return statusLabels[status] || status
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'delivered':
      return 'default'
    case 'processing':
      return 'secondary'
    case 'cancelled':
      return 'destructive'
    default:
      return 'outline'
  }
}
