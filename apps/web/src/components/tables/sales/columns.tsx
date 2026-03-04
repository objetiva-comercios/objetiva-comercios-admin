'use client'

import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@objetiva/utils'
import type { Sale } from '@/types/sale'

const statusVariants = {
  completed: 'default',
  refunded: 'destructive',
  partial_refund: 'outline',
} as const

const paymentMethodLabels = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Crédito',
} as const

export const columns: ColumnDef<Sale>[] = [
  {
    accessorKey: 'saleNumber',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          N.° de venta
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-mono">{row.getValue('saleNumber')}</div>,
  },
  {
    accessorKey: 'customerName',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Cliente
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue('customerName')}</div>,
  },
  {
    accessorKey: 'items',
    header: 'Artículos',
    cell: ({ row }) => {
      const items = row.getValue('items') as Sale['items']
      return <div className="text-sm text-muted-foreground">{items.length} artículos</div>
    },
  },
  {
    accessorKey: 'total',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Total
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const total = parseFloat(row.getValue('total'))
      return <div className="text-right font-medium">{formatCurrency(total)}</div>
    },
  },
  {
    accessorKey: 'paymentMethod',
    header: 'Pago',
    cell: ({ row }) => {
      const method = row.getValue('paymentMethod') as keyof typeof paymentMethodLabels
      return <div className="text-sm">{paymentMethodLabels[method]}</div>
    },
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.getValue('status') as keyof typeof statusVariants
      const statusLabels: Record<string, string> = {
        completed: 'Completada',
        refunded: 'Reembolsada',
        partial_refund: 'Reembolso parcial',
      }
      const label = statusLabels[status] ?? status
      return <Badge variant={statusVariants[status]}>{label}</Badge>
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Fecha
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'))
      return <div className="text-sm text-muted-foreground">{format(date, 'MMM d, yyyy')}</div>
    },
  },
]
