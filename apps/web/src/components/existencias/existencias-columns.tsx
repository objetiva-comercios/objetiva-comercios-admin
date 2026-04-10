'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Existencia, StockStatus } from '@/types/existencia'
import { getStockStatus } from '@/types/existencia'

const statusConfig: Record<
  StockStatus,
  { label: string; variant: 'secondary' | 'outline' | 'destructive'; className?: string }
> = {
  normal: {
    label: 'Normal',
    variant: 'secondary',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  bajo: { label: 'Bajo', variant: 'outline', className: 'text-yellow-700 border-yellow-300' },
  sin_stock: { label: 'Sin Stock', variant: 'destructive' },
}

export type OnStockUpdate = (
  articuloCodigo: string,
  depositoId: number,
  field: 'cantidad' | 'stockMinimo' | 'stockMaximo',
  value: number
) => Promise<void>

export const createExistenciasColumns = (
  onStockUpdate?: OnStockUpdate
): ColumnDef<Existencia>[] => [
  {
    accessorKey: 'articuloCodigo',
    header: 'Codigo',
    size: 120,
    cell: ({ row }) => <div className="font-mono text-sm">{row.getValue('articuloCodigo')}</div>,
  },
  {
    accessorKey: 'articuloNombre',
    header: 'Articulo',
    cell: ({ row }) => <div className="font-medium">{row.getValue('articuloNombre')}</div>,
  },
  {
    id: 'cantidad',
    accessorKey: 'cantidad',
    header: 'Cantidad',
    size: 100,
    cell: ({ row }) => {
      const existencia = row.original
      if (onStockUpdate) {
        // InlineEditCell is rendered by ExistenciasPorDeposito wrapper
        return (
          <div data-field="cantidad" data-value={existencia.cantidad}>
            {existencia.cantidad}
          </div>
        )
      }
      return <div className="tabular-nums">{existencia.cantidad}</div>
    },
  },
  {
    id: 'stockMinimo',
    accessorKey: 'stockMinimo',
    header: 'Min',
    size: 80,
    cell: ({ row }) => {
      const existencia = row.original
      if (onStockUpdate) {
        return (
          <div data-field="stockMinimo" data-value={existencia.stockMinimo}>
            {existencia.stockMinimo}
          </div>
        )
      }
      return <div className="tabular-nums">{existencia.stockMinimo}</div>
    },
  },
  {
    id: 'stockMaximo',
    accessorKey: 'stockMaximo',
    header: 'Max',
    size: 80,
    cell: ({ row }) => {
      const existencia = row.original
      if (onStockUpdate) {
        return (
          <div data-field="stockMaximo" data-value={existencia.stockMaximo}>
            {existencia.stockMaximo}
          </div>
        )
      }
      return <div className="tabular-nums">{existencia.stockMaximo}</div>
    },
  },
  {
    id: 'status',
    header: 'Estado',
    size: 100,
    cell: ({ row }) => {
      const existencia = row.original
      const status = getStockStatus(existencia.cantidad, existencia.stockMinimo)
      const config = statusConfig[status]
      return (
        <Badge variant={config.variant} className={cn(config.className)}>
          {config.label}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'updatedAt',
    header: 'Actualizado',
    size: 140,
    cell: ({ row }) => {
      const date = row.getValue('updatedAt') as string
      if (!date) return <div className="text-sm text-muted-foreground">-</div>
      return (
        <div className="text-sm text-muted-foreground">
          {new Date(date).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </div>
      )
    },
  },
]

export const defaultColumnVisibility = {
  stockMinimo: false,
  stockMaximo: false,
  updatedAt: false,
}
