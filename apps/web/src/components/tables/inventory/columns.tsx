'use client'

import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Inventory } from '@/types/inventory'

const statusColors = {
  in_stock: 'bg-green-100 text-green-800 hover:bg-green-100',
  low_stock: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  out_of_stock: 'bg-red-100 text-red-800 hover:bg-red-100',
} as const

export const columns: ColumnDef<Inventory>[] = [
  {
    accessorKey: 'sku',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          SKU
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-mono">{row.getValue('sku')}</div>,
  },
  {
    accessorKey: 'productName',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Producto
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue('productName')}</div>,
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Cantidad
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const quantity = row.getValue('quantity') as number
      const status = row.original.status
      const colorClass =
        status === 'out_of_stock' ? 'text-red-600' : status === 'low_stock' ? 'text-yellow-600' : ''
      return <div className={'text-right font-medium ' + colorClass}>{quantity}</div>
    },
  },
  {
    accessorKey: 'reservedQuantity',
    header: 'Reservado',
    cell: ({ row }) => {
      const reserved = row.getValue('reservedQuantity') as number
      return <div className="text-right text-muted-foreground">{reserved}</div>
    },
  },
  {
    accessorKey: 'availableQuantity',
    header: 'Disponible',
    cell: ({ row }) => {
      const available = row.getValue('availableQuantity') as number
      return <div className="text-right font-medium">{available}</div>
    },
  },
  {
    accessorKey: 'reorderPoint',
    header: 'Punto de reorden',
    cell: ({ row }) => {
      const reorderPoint = row.getValue('reorderPoint') as number
      return <div className="text-right text-sm text-muted-foreground">{reorderPoint}</div>
    },
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.getValue('status') as keyof typeof statusColors
      const statusLabels: Record<string, string> = {
        in_stock: 'En stock',
        low_stock: 'Stock bajo',
        out_of_stock: 'Sin stock',
      }
      const label = statusLabels[status] ?? status
      return <Badge className={statusColors[status]}>{label}</Badge>
    },
  },
  {
    accessorKey: 'lastRestocked',
    header: 'Último restock',
    cell: ({ row }) => {
      const date = new Date(row.getValue('lastRestocked'))
      return <div className="text-sm text-muted-foreground">{format(date, 'MMM d, yyyy')}</div>
    },
  },
]
