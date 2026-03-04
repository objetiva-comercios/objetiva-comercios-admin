'use client'

import { useState } from 'react'
import { DataTable } from '@/components/tables/data-table'
import { columns } from '@/components/tables/orders/columns'
import { OrderSheet } from '@/components/tables/orders/order-sheet'
import type { Order } from '@/types/order'

interface OrdersClientProps {
  orders: Order[]
}

export function OrdersClient({ orders }: OrdersClientProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleRowClick = (order: Order) => {
    setSelectedOrder(order)
    setSheetOpen(true)
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={orders}
        onRowClick={handleRowClick}
        filterColumn="customerName"
        filterPlaceholder="Filtrar por cliente..."
      />
      <OrderSheet order={selectedOrder} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
