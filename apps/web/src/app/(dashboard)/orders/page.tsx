import { fetchOrders } from '@/lib/api'
import { OrdersClient } from './orders-client'

export default async function OrdersPage() {
  // Fetch orders from backend
  const response = await fetchOrders()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
        <p className="text-muted-foreground">
          Gestioná los pedidos de clientes y seguí el estado de entrega.
        </p>
      </div>
      <OrdersClient orders={response.data} />
    </div>
  )
}
