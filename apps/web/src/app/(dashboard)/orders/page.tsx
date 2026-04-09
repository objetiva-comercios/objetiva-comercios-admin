import { ClipboardList } from 'lucide-react'
import { fetchOrders } from '@/lib/api'
import { OrdersClient } from './orders-client'

export default async function OrdersPage() {
  // Fetch orders from backend
  const response = await fetchOrders()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ClipboardList className="h-7 w-7" style={{ color: '#056ed1' }} />Pedidos</h1>
        <p className="text-muted-foreground">
          Gestioná los pedidos de clientes y seguí el estado de entrega.
        </p>
      </div>
      <OrdersClient orders={response.data} />
    </div>
  )
}
