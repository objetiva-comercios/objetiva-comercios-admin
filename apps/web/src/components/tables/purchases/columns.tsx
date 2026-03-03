'use client'

import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@objetiva/utils'
import type { Purchase } from '@/types/purchase'

const statusVariants = {
  draft: 'secondary',
  ordered: 'default',
  received: 'default',
  cancelled: 'destructive',
} as const

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  ordered: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  received: 'bg-green-100 text-green-800 hover:bg-green-100',
  cancelled: 'bg-red-100 text-red-800 hover:bg-red-100',
} as const

export const columns: ColumnDef<Purchase>[] = [
  {
    accessorKey: 'purchaseNumber',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Purchase Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-mono">{row.getValue('purchaseNumber')}</div>,
  },
  {
    accessorKey: 'supplierName',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Supplier
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue('supplierName')}</div>,
  },
  {
    accessorKey: 'items',
    header: 'Items',
    cell: ({ row }) => {
      const items = row.getValue('items') as Purchase['items']
      return <div className="text-sm text-muted-foreground">{items.length} items</div>
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
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as keyof typeof statusVariants
      return (
        <Badge variant={statusVariants[status]} className={statusColors[status]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'expectedDelivery',
    header: 'Expected Delivery',
    cell: ({ row }) => {
      const date = new Date(row.getValue('expectedDelivery'))
      return <div className="text-sm text-muted-foreground">{format(date, 'MMM d, yyyy')}</div>
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
          Date
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
