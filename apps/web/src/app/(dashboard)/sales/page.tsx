import { ShoppingBag } from 'lucide-react'
import { fetchSales } from '@/lib/api'
import { SalesClient } from './sales-client'

export default async function SalesPage() {
  // Fetch sales from backend
  const response = await fetchSales()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ShoppingBag className="h-7 w-7" style={{ color: '#056ed1' }} />Ventas</h1>
        <p className="text-muted-foreground">Gestión de ventas y transacciones.</p>
      </div>
      <SalesClient sales={response.data} />
    </div>
  )
}
