'use client'

import { useState } from 'react'
import { DataTable } from '@/components/tables/data-table'
import { columns } from '@/components/tables/products/columns'
import { ProductSheet } from '@/components/tables/products/product-sheet'
import type { Product } from '@/types/product'

interface ArticlesClientProps {
  products: Product[]
}

export function ArticlesClient({ products }: ArticlesClientProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleRowClick = (product: Product) => {
    setSelectedProduct(product)
    setSheetOpen(true)
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={products}
        onRowClick={handleRowClick}
        filterColumn="name"
        filterPlaceholder="Filtrar por nombre..."
      />
      <ProductSheet product={selectedProduct} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
