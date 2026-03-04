import { fetchInventory } from '@/lib/api'
import { InventoryClient } from './inventory-client'

export default async function InventoryPage() {
  // Fetch inventory from backend
  const response = await fetchInventory()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground">
          Monitoreá los niveles de stock y el estado del inventario.
        </p>
      </div>
      <InventoryClient inventory={response.data} />
    </div>
  )
}
