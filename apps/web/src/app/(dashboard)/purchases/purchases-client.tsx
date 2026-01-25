'use client'

import { useState } from 'react'
import { DataTable } from '@/components/tables/data-table'
import { columns } from '@/components/tables/purchases/columns'
import { PurchaseSheet } from '@/components/tables/purchases/purchase-sheet'
import type { Purchase } from '@/types/purchase'

interface PurchasesClientProps {
  purchases: Purchase[]
}

export function PurchasesClient({ purchases }: PurchasesClientProps) {
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleRowClick = (purchase: Purchase) => {
    setSelectedPurchase(purchase)
    setSheetOpen(true)
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={purchases}
        onRowClick={handleRowClick}
        filterColumn="supplierName"
        filterPlaceholder="Filter by supplier..."
      />
      <PurchaseSheet purchase={selectedPurchase} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
