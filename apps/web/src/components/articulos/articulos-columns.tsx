'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@objetiva/utils'
import type { Articulo } from '@/types/articulo'

export const columns: ColumnDef<Articulo>[] = [
  {
    accessorKey: 'codigo',
    header: 'Codigo',
    cell: ({ row }) => <div className="font-mono text-sm">{row.getValue('codigo')}</div>,
  },
  {
    accessorKey: 'nombre',
    header: 'Nombre',
    cell: ({ row }) => <div className="font-medium">{row.getValue('nombre')}</div>,
  },
  {
    accessorKey: 'marca',
    header: 'Marca',
    cell: ({ row }) => {
      const marca = row.getValue('marca') as string | null
      return <div className="text-sm">{marca ?? '-'}</div>
    },
  },
  {
    accessorKey: 'precio',
    header: 'Precio',
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
    cell: ({ row }) => {
      const activo = row.getValue('activo') as boolean
      return (
        <Badge variant={activo ? 'default' : 'secondary'}>{activo ? 'Activo' : 'Inactivo'}</Badge>
      )
    },
  },
  // Hidden by default columns
  {
    accessorKey: 'sku',
    header: 'SKU',
    cell: ({ row }) => {
      const sku = row.getValue('sku') as string | null
      return <div className="font-mono text-sm">{sku ?? '-'}</div>
    },
  },
  {
    accessorKey: 'codigoBarras',
    header: 'Cod. Barras',
    cell: ({ row }) => {
      const cb = row.getValue('codigoBarras') as string | null
      return <div className="font-mono text-sm">{cb ?? '-'}</div>
    },
  },
  {
    accessorKey: 'modelo',
    header: 'Modelo',
    cell: ({ row }) => {
      const modelo = row.getValue('modelo') as string | null
      return <div className="text-sm">{modelo ?? '-'}</div>
    },
  },
  {
    accessorKey: 'talle',
    header: 'Talle',
    cell: ({ row }) => {
      const talle = row.getValue('talle') as string | null
      return <div className="text-sm">{talle ?? '-'}</div>
    },
  },
  {
    accessorKey: 'color',
    header: 'Color',
    cell: ({ row }) => {
      const color = row.getValue('color') as string | null
      return <div className="text-sm">{color ?? '-'}</div>
    },
  },
  {
    accessorKey: 'material',
    header: 'Material',
    cell: ({ row }) => {
      const material = row.getValue('material') as string | null
      return <div className="text-sm">{material ?? '-'}</div>
    },
  },
  {
    accessorKey: 'costo',
    header: 'Costo',
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
    cell: ({ row }) => {
      const erp = row.getValue('erpCodigo') as string | null
      return <div className="font-mono text-sm">{erp ?? '-'}</div>
    },
  },
]

/** Default column visibility — hides secondary columns */
export const defaultColumnVisibility = {
  sku: false,
  codigoBarras: false,
  modelo: false,
  talle: false,
  color: false,
  material: false,
  costo: false,
  erpCodigo: false,
}
