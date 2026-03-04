'use client'

import { useState } from 'react'
import { DataTable } from '@/components/tables/data-table'
import { columns } from '@/components/tables/sales/columns'
import { SaleSheet } from '@/components/tables/sales/sale-sheet'
import type { Sale } from '@/types/sale'

interface SalesClientProps {
  sales: Sale[]
}

export function SalesClient({ sales }: SalesClientProps) {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleRowClick = (sale: Sale) => {
    setSelectedSale(sale)
    setSheetOpen(true)
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={sales}
        onRowClick={handleRowClick}
        filterColumn="customerName"
        filterPlaceholder="Filtrar por cliente..."
      />
      <SaleSheet sale={selectedSale} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
