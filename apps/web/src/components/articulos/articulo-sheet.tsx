'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { ChevronRight, ImageIcon, PencilIcon } from 'lucide-react'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@objetiva/utils'
import { fetchExistenciasByArticuloClient } from '@/lib/api.client'
import { getStockStatus } from '@/types/existencia'
import type { Articulo } from '@/types/articulo'
import type { Existencia } from '@/types/existencia'
import { useArticulosConfig } from '@/hooks/use-articulos-config'
import { ImagenLightbox } from './imagen-lightbox'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function getThumbUrl(detailUrl: string): string {
  return detailUrl.replace('_detail.webp', '_thumb.webp')
}

function isValidImageUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && url.length > 0 && url.toLowerCase() !== 'null'
}

interface ArticuloSheetProps {
  articulo: Articulo | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{value ?? '—'}</span>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 bg-muted rounded-sm p-3">
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline [&[data-state=open]>svg]:rotate-90">
        <ChevronRight className="h-4 w-4 transition-transform" />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">{children}</CollapsibleContent>
    </Collapsible>
  )
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy HH:mm')
  } catch {
    return '—'
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
  const { isCampoVisible } = useArticulosConfig()
  const [lightbox, setLightbox] = useState<{ images: string[]; initialIndex: number } | null>(null)

  function openLightboxForType(_tipo: 'etiqueta' | 'producto', clickedUrl: string) {
    if (!articulo) return
    const productoUrls = articulo.imagenesProducto.filter(isValidImageUrl)
    const etiquetaUrls = articulo.imagenesEtiqueta.filter(isValidImageUrl)
    const allImages = [...productoUrls, ...etiquetaUrls]
    const clickedIndex = allImages.indexOf(clickedUrl)
    setLightbox({ images: allImages, initialIndex: Math.max(0, clickedIndex) })
  }

  function renderSlot(
    tipo: 'producto' | 'etiqueta',
    index: number,
    url: string | null | undefined
  ) {
    const hasImage = isValidImageUrl(url)
    if (hasImage) {
      return (
        <button
          key={`${tipo}-${index}`}
          onClick={() => openLightboxForType(tipo, url)}
          className="w-12 h-12 rounded-sm overflow-hidden cursor-pointer border border-border hover:opacity-80 transition-opacity flex-shrink-0"
        >
          <img
            src={API_BASE_URL + getThumbUrl(url)}
            className="w-full h-full object-cover"
            alt=""
          />
        </button>
      )
    }
    return (
      <div
        key={`${tipo}-${index}`}
        className="w-12 h-12 rounded-sm border-2 border-dashed border-muted-foreground/20 flex items-center justify-center flex-shrink-0"
      >
        <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
      </div>
    )
  }

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
      <SheetContent className="w-[400px] md:w-[540px] sm:max-w-[35rem] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between pr-2">
            <div>
              <SheetTitle>{articulo.nombre}</SheetTitle>
              <SheetDescription>
                {articulo.codigo}
                {isCampoVisible('sku') && articulo.sku ? ` · SKU: ${articulo.sku}` : ''}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={articulo.activo ? 'default' : 'secondary'}>
                {articulo.activo ? 'Activo' : 'Inactivo'}
              </Badge>
              {/* Phase 31 Deploy 2: link usa sku (PK) */}
              <Button asChild variant="outline" size="sm" className="h-8 text-sm">
                <Link href={`/articulos/${encodeURIComponent(articulo.sku!)}/editar`}>
                  <PencilIcon className="mr-1.5 h-3.5 w-3.5" />
                  Editar
                </Link>
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Hero stat cards */}
          <div className="flex gap-2">
            <StatCard
              label="Precio"
              value={articulo.precio ? formatCurrency(parseFloat(articulo.precio)) : '—'}
            />
            {isCampoVisible('costo') && (
              <StatCard
                label="Costo"
                value={articulo.costo ? formatCurrency(parseFloat(articulo.costo)) : '—'}
              />
            )}
            <StatCard label="Stock" value={stockLoading ? '...' : totalStock.toString()} />
          </div>

          <Separator />

          {/* Images section — 9 slots: 6 producto + separator + 3 etiqueta */}
          <div>
            <SectionHeader title="Imagenes" />
            <div className="mt-2 flex items-start gap-4">
              {/* Grupo Producto */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Producto</p>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5].map(i =>
                    renderSlot('producto', i, articulo.imagenesProducto[i])
                  )}
                </div>
              </div>
              {/* Separador vertical */}
              <div className="w-px bg-border self-stretch mt-4" />
              {/* Grupo Etiqueta */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Etiqueta</p>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => renderSlot('etiqueta', i, articulo.imagenesEtiqueta[i]))}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Properties grid 2-col */}
          <div>
            <SectionHeader title="Propiedades" />
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
              {isCampoVisible('objeto') && (
                <FieldRow label="Tipo / Objeto" value={articulo.objeto} />
              )}
              {isCampoVisible('marca') && <FieldRow label="Marca" value={articulo.marca} />}
              {isCampoVisible('modelo') && <FieldRow label="Modelo" value={articulo.modelo} />}
              {isCampoVisible('talle') && <FieldRow label="Talle" value={articulo.talle} />}
              {isCampoVisible('color') && <FieldRow label="Color" value={articulo.color} />}
              {isCampoVisible('material') && (
                <FieldRow label="Material" value={articulo.material} />
              )}
              {isCampoVisible('presentacion') && (
                <FieldRow label="Presentacion" value={articulo.presentacion} />
              )}
              {isCampoVisible('medida') && <FieldRow label="Medida" value={articulo.medida} />}
            </div>
            {((isCampoVisible('codigoBarras') && articulo.codigoBarras) ||
              (isCampoVisible('observaciones') && articulo.observaciones)) && (
              <div className="mt-2 space-y-1">
                {isCampoVisible('codigoBarras') && articulo.codigoBarras && (
                  <FieldRow label="Cod. Barras" value={articulo.codigoBarras} />
                )}
                {isCampoVisible('observaciones') && articulo.observaciones && (
                  <FieldRow label="Observaciones" value={articulo.observaciones} />
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Stock por Deposito */}
          <div>
            <SectionHeader title="Stock por Deposito" />
            <div className="mt-2 border rounded-sm">
              {stockLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-full" />
                  ))}
                </div>
              ) : existencias.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Sin stock registrado</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="h-8 px-3 text-left font-medium text-muted-foreground">
                        Deposito
                      </th>
                      <th className="h-8 px-3 text-right font-medium text-muted-foreground">
                        Cant.
                      </th>
                      <th className="h-8 px-3 text-right font-medium text-muted-foreground">Min</th>
                      <th className="h-8 px-3 text-right font-medium text-muted-foreground">Max</th>
                      <th className="h-8 px-3 text-right font-medium text-muted-foreground">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {existencias.map(e => {
                      const status = getStockStatus(e.cantidad, e.stockMinimo)
                      const config = stockStatusConfig[status]
                      return (
                        <tr key={`${e.articuloSku}-${e.depositoId}`} className="border-t">
                          <td className="h-8 px-3">{e.depositoNombre ?? `Dep. ${e.depositoId}`}</td>
                          <td className="h-8 px-3 text-right tabular-nums">{e.cantidad}</td>
                          <td className="h-8 px-3 text-right tabular-nums text-muted-foreground">
                            {e.stockMinimo}
                          </td>
                          <td className="h-8 px-3 text-right tabular-nums text-muted-foreground">
                            {e.stockMaximo}
                          </td>
                          <td className="h-8 px-3 text-right">
                            <Badge variant={config.variant} className="text-xs">
                              {config.label}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="border-t">
                      <td className="h-8 px-3 font-semibold">Total</td>
                      <td className="h-8 px-3 text-right font-semibold tabular-nums">
                        {totalStock}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <Separator />

          {/* Estado — compact single line */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Creado</span>
            <span>{formatDate(articulo.createdAt)}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">Actualizado</span>
            <span>{formatDate(articulo.updatedAt)}</span>
          </div>

          {/* Collapsible sections — always closed */}
          <div className="space-y-2">
            {isCampoVisible('erp') && hasAnyErpField(articulo) && (
              <CollapsibleSection title="ERP">
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
              </CollapsibleSection>
            )}

            {isCampoVisible('origen') && hasAnyOriginField(articulo) && (
              <CollapsibleSection title="Origen">
                <div className="space-y-1.5">
                  <FieldRow label="Fuente" value={articulo.originSource} />
                  <FieldRow label="Sync ID" value={articulo.originSyncId} />
                  <FieldRow label="Sincronizado" value={formatDate(articulo.originSyncedAt)} />
                </div>
              </CollapsibleSection>
            )}

            {articulo.etiquetasOcr && articulo.etiquetasOcr.length > 0 && (
              <CollapsibleSection title="Etiquetas OCR">
                <div className="flex flex-wrap gap-1">
                  {articulo.etiquetasOcr.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {(articulo.erpDatos != null || articulo.jsonArticulo != null) && (
              <CollapsibleSection title="Datos crudos">
                <div className="space-y-3">
                  {articulo.erpDatos != null && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">ERP Datos</p>
                      <pre className="rounded-sm bg-muted p-3 text-xs overflow-x-auto max-h-48 overflow-y-auto">
                        {JSON.stringify(articulo.erpDatos, null, 2)}
                      </pre>
                    </div>
                  )}
                  {articulo.jsonArticulo != null && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">JSON Articulo</p>
                      <pre className="rounded-sm bg-muted p-3 text-xs overflow-x-auto max-h-48 overflow-y-auto">
                        {JSON.stringify(articulo.jsonArticulo, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}
          </div>
        </div>

        <ImagenLightbox
          images={lightbox?.images ?? []}
          initialIndex={lightbox?.initialIndex ?? 0}
          open={lightbox !== null}
          onOpenChange={open => {
            if (!open) setLightbox(null)
          }}
        />
      </SheetContent>
    </Sheet>
  )
}
