import { fetchInventory } from '@/lib/api'
import { InventoryClient } from './inventory-client'

export default async function InventoryPage() {
  // Fetch inventory from backend
  const response = await fetchInventory()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">Monitor stock levels and inventory status.</p>
      </div>
      <InventoryClient inventory={response.items} />
    </div>
  )
}
