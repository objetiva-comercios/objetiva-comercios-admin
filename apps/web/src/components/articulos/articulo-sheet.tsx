'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { PencilIcon } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@objetiva/utils'
import { fetchExistenciasByArticuloClient } from '@/lib/api.client'
import { getStockStatus } from '@/types/existencia'
import type { Articulo } from '@/types/articulo'
import type { Existencia } from '@/types/existencia'

interface ArticuloSheetProps {
  articulo: Articulo | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{value ?? '-'}</span>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <h3 className="text-sm font-medium mb-2">{title}</h3>
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy HH:mm')
  } catch {
    return '-'
  }
}

function hasAnyErpField(articulo: Articulo): boolean {
  return !!(
    articulo.erpId ||
    articulo.erpCodigo ||
    articulo.erpNombre ||
    articulo.erpPrecio ||
    articulo.erpCosto ||
    articulo.erpUnidades ||
    articulo.erpSincronizado
  )
}

function hasAnyOriginField(articulo: Articulo): boolean {
  return !!(articulo.originSource || articulo.originSyncId || articulo.originSyncedAt)
}

const stockStatusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' }
> = {
  normal: { label: 'Normal', variant: 'default' },
  bajo: { label: 'Bajo', variant: 'secondary' },
  sin_stock: { label: 'Sin stock', variant: 'destructive' },
}

export function ArticuloSheet({ articulo, open, onOpenChange }: ArticuloSheetProps) {
  const [existencias, setExistencias] = useState<Existencia[]>([])
  const [stockLoading, setStockLoading] = useState(false)

  useEffect(() => {
    if (!articulo?.codigo || !open) {
      setExistencias([])
      return
    }
    let cancelled = false
    setStockLoading(true)
    fetchExistenciasByArticuloClient(articulo.codigo)
      .then(data => {
        if (!cancelled) setExistencias(data)
      })
      .catch(err => {
        console.error('Error fetching stock:', err)
        if (!cancelled) setExistencias([])
      })
      .finally(() => {
        if (!cancelled) setStockLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [articulo?.codigo, open])

  if (!articulo) return null

  const totalStock = existencias.reduce((sum, e) => sum + e.cantidad, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] md:w-[540px] sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between pr-2">
            <div>
              <SheetTitle>{articulo.nombre}</SheetTitle>
              <SheetDescription>Codigo: {articulo.codigo}</SheetDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="h-8 text-sm">
              <Link href={`/articulos/${encodeURIComponent(articulo.codigo)}/editar`}>
                <PencilIcon className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Link>
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Identificacion */}
          <div>
            <SectionHeader title="Identificacion" />
            <div className="space-y-1.5">
              <FieldRow label="Codigo" value={articulo.codigo} />
              <FieldRow label="Nombre" value={articulo.nombre} />
              <FieldRow label="SKU" value={articulo.sku} />
              <FieldRow label="Cod. Barras" value={articulo.codigoBarras} />
              <FieldRow label="Observaciones" value={articulo.observaciones} />
            </div>
          </div>

          <Separator />

          {/* Propiedades */}
          <div>
            <SectionHeader title="Propiedades" />
            <div className="space-y-1.5">
              <FieldRow label="Marca" value={articulo.marca} />
              <FieldRow label="Modelo" value={articulo.modelo} />
              <FieldRow label="Talle" value={articulo.talle} />
              <FieldRow label="Color" value={articulo.color} />
              <FieldRow label="Material" value={articulo.material} />
              <FieldRow label="Presentacion" value={articulo.presentacion} />
              <FieldRow label="Medida" value={articulo.medida} />
            </div>
          </div>

          <Separator />

          {/* Precios */}
          <div>
            <SectionHeader title="Precios" />
            <div className="space-y-1.5">
              <FieldRow
                label="Precio"
                value={articulo.precio ? formatCurrency(parseFloat(articulo.precio)) : null}
              />
              <FieldRow
                label="Costo"
                value={articulo.costo ? formatCurrency(parseFloat(articulo.costo)) : null}
              />
            </div>
          </div>

          <Separator />

          {/* Stock por Deposito */}
          <div>
            <SectionHeader title="Stock por Deposito" />
            {stockLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : existencias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin stock registrado</p>
            ) : (
              <div>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="h-8 text-left font-medium text-muted-foreground">Deposito</th>
                      <th className="h-8 text-right font-medium text-muted-foreground">Cantidad</th>
                      <th className="h-8 text-right font-medium text-muted-foreground">Min</th>
                      <th className="h-8 text-right font-medium text-muted-foreground">Max</th>
                      <th className="h-8 text-right font-medium text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existencias.map(e => {
                      const status = getStockStatus(e.cantidad, e.stockMinimo)
                      const config = stockStatusConfig[status]
                      return (
                        <tr key={`${e.articuloCodigo}-${e.depositoId}`} className="border-t">
                          <td className="h-8">{e.depositoNombre ?? `Dep. ${e.depositoId}`}</td>
                          <td className="h-8 text-right tabular-nums">{e.cantidad}</td>
                          <td className="h-8 text-right tabular-nums text-muted-foreground">
                            {e.stockMinimo}
                          </td>
                          <td className="h-8 text-right tabular-nums text-muted-foreground">
                            {e.stockMaximo}
                          </td>
                          <td className="h-8 text-right">
                            <Badge variant={config.variant} className="text-xs">
                              {config.label}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="border-t">
                      <td className="h-8 font-semibold">Total</td>
                      <td className="h-8 text-right font-semibold tabular-nums">{totalStock}</td>
                      <td colSpan={3} />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Separator />

          {/* Estado */}
          <div>
            <SectionHeader title="Estado" />
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estado</span>
                <Badge variant={articulo.activo ? 'default' : 'secondary'}>
                  {articulo.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <FieldRow label="Creado" value={formatDate(articulo.createdAt)} />
              <FieldRow label="Actualizado" value={formatDate(articulo.updatedAt)} />
            </div>
          </div>

          {/* ERP (conditional) */}
          {hasAnyErpField(articulo) && (
            <>
              <Separator />
              <div>
                <SectionHeader title="ERP" />
                <div className="space-y-1.5">
                  <FieldRow label="ERP ID" value={articulo.erpId} />
                  <FieldRow label="ERP Codigo" value={articulo.erpCodigo} />
                  <FieldRow label="ERP Nombre" value={articulo.erpNombre} />
                  <FieldRow
                    label="ERP Precio"
                    value={
                      articulo.erpPrecio ? formatCurrency(parseFloat(articulo.erpPrecio)) : null
                    }
                  />
                  <FieldRow
                    label="ERP Costo"
                    value={articulo.erpCosto ? formatCurrency(parseFloat(articulo.erpCosto)) : null}
                  />
                  <FieldRow label="ERP Unidades" value={articulo.erpUnidades?.toString() ?? null} />
                  <FieldRow
                    label="Sincronizado"
                    value={
                      articulo.erpSincronizado === null
                        ? null
                        : articulo.erpSincronizado
                          ? 'Si'
                          : 'No'
                    }
                  />
                  <FieldRow label="Fecha Sync" value={formatDate(articulo.erpFechaSync)} />
                </div>
              </div>
            </>
          )}

          {/* Origen (conditional) */}
          {hasAnyOriginField(articulo) && (
            <>
              <Separator />
              <div>
                <SectionHeader title="Origen" />
                <div className="space-y-1.5">
                  <FieldRow label="Fuente" value={articulo.originSource} />
                  <FieldRow label="Sync ID" value={articulo.originSyncId} />
                  <FieldRow label="Sincronizado" value={formatDate(articulo.originSyncedAt)} />
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
