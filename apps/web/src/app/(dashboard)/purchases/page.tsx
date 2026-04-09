import { ShoppingCart } from 'lucide-react'
import { fetchPurchases } from '@/lib/api'
import { PurchasesClient } from './purchases-client'

export default async function PurchasesPage() {
  // Fetch purchases from backend
  const response = await fetchPurchases()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><ShoppingCart className="h-8 w-8" style={{ color: '#056ed1' }} />Compras</h1>
        <p className="text-muted-foreground">Gestión de compras y órdenes a proveedores.</p>
      </div>
      <PurchasesClient purchases={response.data} />
    </div>
  )
}
