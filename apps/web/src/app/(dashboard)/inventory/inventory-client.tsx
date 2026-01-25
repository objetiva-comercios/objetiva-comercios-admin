'use client'

import { useState } from 'react'
import { DataTable } from '@/components/tables/data-table'
import { columns } from '@/components/tables/inventory/columns'
import { InventorySheet } from '@/components/tables/inventory/inventory-sheet'
import type { Inventory } from '@/types/inventory'

interface InventoryClientProps {
  inventory: Inventory[]
}

export function InventoryClient({ inventory }: InventoryClientProps) {
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleRowClick = (item: Inventory) => {
    setSelectedInventory(item)
    setSheetOpen(true)
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={inventory}
        onRowClick={handleRowClick}
        filterColumn="productName"
        filterPlaceholder="Filter by product name..."
      />
      <InventorySheet inventory={selectedInventory} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
