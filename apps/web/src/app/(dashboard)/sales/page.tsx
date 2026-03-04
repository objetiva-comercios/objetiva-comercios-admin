import { fetchSales } from '@/lib/api'
import { SalesClient } from './sales-client'

export default async function SalesPage() {
  // Fetch sales from backend
  const response = await fetchSales()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
        <p className="text-muted-foreground">Gestión de ventas y transacciones.</p>
      </div>
      <SalesClient sales={response.data} />
    </div>
  )
}
