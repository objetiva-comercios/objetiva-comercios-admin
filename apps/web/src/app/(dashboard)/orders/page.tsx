import { fetchOrders } from '@/lib/api'
import { OrdersClient } from './orders-client'

export default async function OrdersPage() {
  // Fetch orders from backend
  const response = await fetchOrders()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          Manage customer orders and track their fulfillment status.
        </p>
      </div>
      <OrdersClient orders={response.items} />
    </div>
  )
}
