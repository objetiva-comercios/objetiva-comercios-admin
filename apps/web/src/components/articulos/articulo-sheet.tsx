'use client'

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
import { formatCurrency } from '@objetiva/utils'
import type { Articulo } from '@/types/articulo'

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

export function ArticuloSheet({ articulo, open, onOpenChange }: ArticuloSheetProps) {
  if (!articulo) return null

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
