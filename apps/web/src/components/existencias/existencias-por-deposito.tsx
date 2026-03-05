'use client'

import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'

import { ServerDataTable } from '@/components/tables/server-data-table'
import { InlineEditCell } from '@/components/existencias/inline-edit-cell'
import {
  createExistenciasColumns,
  defaultColumnVisibility,
  type OnStockUpdate,
} from '@/components/existencias/existencias-columns'
import type { Existencia } from '@/types/existencia'

interface ExistenciasPorDepositoProps {
  data: Existencia[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  page: number
  onPageChange: (page: number) => void
  isLoading: boolean
  onStockUpdate: OnStockUpdate
}

export function ExistenciasPorDeposito({
  data,
  meta,
  page,
  onPageChange,
  isLoading,
  onStockUpdate,
}: ExistenciasPorDepositoProps) {
  const columns = useMemo(() => {
    const baseCols = createExistenciasColumns(onStockUpdate)

    // Override cantidad, stockMinimo, stockMaximo cells with InlineEditCell
    const editableFields = ['cantidad', 'stockMinimo', 'stockMaximo'] as const

    return baseCols.map(col => {
      const colId = (col as { id?: string }).id || (col as { accessorKey?: string }).accessorKey
      if (editableFields.includes(colId as (typeof editableFields)[number])) {
        return {
          ...col,
          cell: ({ row }: { row: { original: Existencia } }) => {
            const existencia = row.original
            const field = colId as 'cantidad' | 'stockMinimo' | 'stockMaximo'
            return (
              <InlineEditCell
                value={existencia[field]}
                onSave={async (newValue: number) => {
                  await onStockUpdate(
                    existencia.articuloCodigo,
                    existencia.depositoId,
                    field,
                    newValue
                  )
                }}
              />
            )
          },
        } as ColumnDef<Existencia>
      }
      return col
    })
  }, [onStockUpdate])

  return (
    <ServerDataTable
      columns={columns}
      data={data}
      pageCount={meta.totalPages}
      currentPage={page}
      onPageChange={onPageChange}
      defaultColumnVisibility={defaultColumnVisibility}
      isLoading={isLoading}
    />
  )
}
