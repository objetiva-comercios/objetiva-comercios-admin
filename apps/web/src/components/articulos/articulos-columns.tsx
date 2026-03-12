'use client'

import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, PencilIcon, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@objetiva/utils'
import type { Articulo } from '@/types/articulo'

interface ColumnHandlers {
  onEdit: (articulo: Articulo) => void
  onToggle: (articulo: Articulo) => void
}

function RowActions({ articulo, handlers }: { articulo: Articulo; handlers: ColumnHandlers }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={e => {
            e.stopPropagation()
            handlers.onEdit(articulo)
          }}
        >
          <PencilIcon className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={e => {
            e.stopPropagation()
            handlers.onToggle(articulo)
          }}
        >
          {articulo.activo ? 'Desactivar' : 'Reactivar'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function getColumns(handlers: ColumnHandlers): ColumnDef<Articulo>[] {
  return [
    {
      accessorKey: 'codigo',
      header: ({ column }) => {
        const sorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 text-sm font-medium"
            onClick={() => column.toggleSorting(sorted === 'asc')}
          >
            Codigo
            {sorted === 'asc' ? (
              <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
            ) : sorted === 'desc' ? (
              <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        )
      },
      enableHiding: false,
      enableSorting: true,
      cell: ({ row }) => <div className="font-mono text-sm">{row.getValue('codigo')}</div>,
    },
    {
      accessorKey: 'nombre',
      header: ({ column }) => {
        const sorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 text-sm font-medium"
            onClick={() => column.toggleSorting(sorted === 'asc')}
          >
            Nombre
            {sorted === 'asc' ? (
              <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
            ) : sorted === 'desc' ? (
              <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        )
      },
      enableHiding: false,
      enableSorting: true,
      cell: ({ row }) => <div className="font-medium">{row.getValue('nombre')}</div>,
    },
    {
      accessorKey: 'marca',
      header: 'Marca',
      enableSorting: false,
      cell: ({ row }) => {
        const marca = row.getValue('marca') as string | null
        return <div className="text-sm">{marca ?? '-'}</div>
      },
    },
    {
      accessorKey: 'modelo',
      header: 'Modelo',
      enableSorting: false,
      cell: ({ row }) => {
        const modelo = row.getValue('modelo') as string | null
        return <div className="text-sm">{modelo ?? '-'}</div>
      },
    },
    {
      accessorKey: 'medida',
      header: 'Medida',
      enableSorting: false,
      cell: ({ row }) => {
        const medida = row.getValue('medida') as string | null
        return <div className="text-sm">{medida ?? '-'}</div>
      },
    },
    {
      accessorKey: 'presentacion',
      header: 'Presentacion',
      enableSorting: false,
      cell: ({ row }) => {
        const presentacion = row.getValue('presentacion') as string | null
        return <div className="text-sm">{presentacion ?? '-'}</div>
      },
    },
    {
      accessorKey: 'erpUnidades',
      header: 'Unidades',
      enableSorting: false,
      cell: ({ row }) => {
        const unidades = row.getValue('erpUnidades') as number | null
        return (
          <div className="text-sm">
            {unidades !== null && unidades !== undefined ? unidades : '-'}
          </div>
        )
      },
    },
    {
      accessorKey: 'objeto',
      header: 'Objeto',
      enableSorting: false,
      cell: ({ row }) => {
        const objeto = row.getValue('objeto') as string | null
        return <div className="text-sm">{objeto ?? '-'}</div>
      },
    },
    {
      accessorKey: 'precio',
      enableHiding: false,
      header: ({ column }) => {
        const sorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 text-sm font-medium"
            onClick={() => column.toggleSorting(sorted === 'asc')}
          >
            Precio
            {sorted === 'asc' ? (
              <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
            ) : sorted === 'desc' ? (
              <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        )
      },
      enableSorting: true,
      cell: ({ row }) => {
        const precio = row.getValue('precio') as string | null
        if (!precio) return <div className="text-right text-sm text-muted-foreground">-</div>
        return (
          <div className="text-right font-medium text-sm">{formatCurrency(parseFloat(precio))}</div>
        )
      },
    },
    {
      accessorKey: 'activo',
      header: 'Estado',
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const activo = row.getValue('activo') as boolean
        return (
          <Badge variant={activo ? 'default' : 'secondary'}>{activo ? 'Activo' : 'Inactivo'}</Badge>
        )
      },
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      enableSorting: false,
      cell: ({ row }) => {
        const sku = row.getValue('sku') as string | null
        return <div className="font-mono text-sm">{sku ?? '-'}</div>
      },
    },
    {
      accessorKey: 'codigoBarras',
      header: 'Cod. Barras',
      enableSorting: false,
      cell: ({ row }) => {
        const cb = row.getValue('codigoBarras') as string | null
        return <div className="font-mono text-sm">{cb ?? '-'}</div>
      },
    },
    {
      accessorKey: 'talle',
      header: 'Talle',
      enableSorting: false,
      cell: ({ row }) => {
        const talle = row.getValue('talle') as string | null
        return <div className="text-sm">{talle ?? '-'}</div>
      },
    },
    {
      accessorKey: 'color',
      header: 'Color',
      enableSorting: false,
      cell: ({ row }) => {
        const color = row.getValue('color') as string | null
        return <div className="text-sm">{color ?? '-'}</div>
      },
    },
    {
      accessorKey: 'material',
      header: 'Material',
      enableSorting: false,
      cell: ({ row }) => {
        const material = row.getValue('material') as string | null
        return <div className="text-sm">{material ?? '-'}</div>
      },
    },
    {
      accessorKey: 'costo',
      header: ({ column }) => {
        const sorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 text-sm font-medium"
            onClick={() => column.toggleSorting(sorted === 'asc')}
          >
            Costo
            {sorted === 'asc' ? (
              <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
            ) : sorted === 'desc' ? (
              <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        )
      },
      enableSorting: true,
      cell: ({ row }) => {
        const costo = row.getValue('costo') as string | null
        if (!costo) return <div className="text-right text-sm text-muted-foreground">-</div>
        return (
          <div className="text-right font-medium text-sm">{formatCurrency(parseFloat(costo))}</div>
        )
      },
    },
    {
      accessorKey: 'erpCodigo',
      header: 'ERP Codigo',
      enableSorting: false,
      cell: ({ row }) => {
        const erp = row.getValue('erpCodigo') as string | null
        return <div className="font-mono text-sm">{erp ?? '-'}</div>
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => <RowActions articulo={row.original} handlers={handlers} />,
    },
  ]
}
