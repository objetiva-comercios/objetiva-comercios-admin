# Articulo Detail/Edit Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign ArticuloSheet (detail panel) and edit page to have proper visual hierarchy, compact layout, and image placeholder grid.

**Architecture:** Three files change: ArticuloSheet gets hero cards + grid + collapsibles, ArticuloForm gets section cards + collapsible ERP/Origen + new props, edit page gets sticky header + 2-column layout with image placeholders.

**Tech Stack:** Next.js 14, React, shadcn/ui (Collapsible, Badge, Button, Sheet, Separator), Tailwind CSS with Tabler aesthetic conventions.

**Spec:** `docs/superpowers/specs/2026-03-11-articulo-detail-edit-redesign.md`

---

## File Structure

| File                                                              | Action     | Responsibility                                                                                           |
| ----------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/articulos/articulo-sheet.tsx`            | Rewrite    | Detail panel with hero cards, grid props, collapsible sections                                           |
| `apps/web/src/components/articulos/articulo-form.tsx`             | Rewrite    | Form with section cards, collapsible ERP/Origen, `showSubmitButton` + `onLoadingChange` + `formId` props |
| `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` | Rewrite    | Sticky header, 2-col layout, external submit button, image placeholders                                  |
| `apps/web/src/app/(dashboard)/articulos/nuevo/page.tsx`           | No changes | Inherits form improvements, keeps current single-column layout                                           |

---

## Chunk 1: ArticuloSheet Redesign

### Task 1: Rewrite ArticuloSheet layout

**Files:**

- Rewrite: `apps/web/src/components/articulos/articulo-sheet.tsx`

- [ ] **Step 1: Replace the full ArticuloSheet component**

Rewrite `apps/web/src/components/articulos/articulo-sheet.tsx` with this complete implementation:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { ChevronRight, PencilIcon } from 'lucide-react'
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
              <SheetDescription>
                {articulo.codigo}
                {articulo.sku ? ` · SKU: ${articulo.sku}` : ''}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={articulo.activo ? 'default' : 'secondary'}>
                {articulo.activo ? 'Activo' : 'Inactivo'}
              </Badge>
              <Button asChild variant="outline" size="sm" className="h-8 text-sm">
                <Link href={`/articulos/${encodeURIComponent(articulo.codigo)}/editar`}>
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
            <StatCard
              label="Costo"
              value={articulo.costo ? formatCurrency(parseFloat(articulo.costo)) : '—'}
            />
            <StatCard label="Stock" value={stockLoading ? '...' : totalStock.toString()} />
          </div>

          <Separator />

          {/* Properties grid 2-col */}
          <div>
            <SectionHeader title="Propiedades" />
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
              <FieldRow label="Marca" value={articulo.marca} />
              <FieldRow label="Modelo" value={articulo.modelo} />
              <FieldRow label="Talle" value={articulo.talle} />
              <FieldRow label="Color" value={articulo.color} />
              <FieldRow label="Material" value={articulo.material} />
              <FieldRow label="Presentacion" value={articulo.presentacion} />
              <FieldRow label="Medida" value={articulo.medida} />
            </div>
            {/* Extra fields from identification if they have values */}
            {(articulo.codigoBarras || articulo.observaciones) && (
              <div className="mt-2 space-y-1">
                {articulo.codigoBarras && (
                  <FieldRow label="Cod. Barras" value={articulo.codigoBarras} />
                )}
                {articulo.observaciones && (
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
                        <tr key={`${e.articuloCodigo}-${e.depositoId}`} className="border-t">
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
            {hasAnyErpField(articulo) && (
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

            {hasAnyOriginField(articulo) && (
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
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd apps/web && pnpm build --no-lint 2>&1 | tail -20`
Expected: Build succeeds (or at least no errors in articulo-sheet.tsx)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/articulos/articulo-sheet.tsx
git commit -m "refactor(ui): redesign ArticuloSheet with hero cards, grid props, collapsibles"
```

---

## Chunk 2: ArticuloForm Restructure

### Task 2: Add new props and restructure ArticuloForm sections

**Files:**

- Rewrite: `apps/web/src/components/articulos/articulo-form.tsx`

- [ ] **Step 1: Replace the full ArticuloForm component**

Rewrite `apps/web/src/components/articulos/articulo-form.tsx` with this complete implementation:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ChevronRight, Loader2 } from 'lucide-react'

import type { Articulo } from '@/types/articulo'
import { createArticulo, updateArticulo } from '@/lib/api.client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'

const articuloFormSchema = z.object({
  codigo: z.string().min(1, 'El codigo es obligatorio').max(50),
  nombre: z.string().min(1, 'El nombre es obligatorio').max(255),
  sku: z.string().optional().or(z.literal('')),
  codigoBarras: z.string().optional().or(z.literal('')),
  observaciones: z.string().optional().or(z.literal('')),
  marca: z.string().optional().or(z.literal('')),
  modelo: z.string().optional().or(z.literal('')),
  talle: z.string().optional().or(z.literal('')),
  color: z.string().optional().or(z.literal('')),
  material: z.string().optional().or(z.literal('')),
  presentacion: z.string().optional().or(z.literal('')),
  medida: z.string().optional().or(z.literal('')),
  precio: z.string().optional().or(z.literal('')),
  costo: z.string().optional().or(z.literal('')),
  erpId: z.string().optional().or(z.literal('')),
  erpCodigo: z.string().optional().or(z.literal('')),
  erpNombre: z.string().optional().or(z.literal('')),
  erpPrecio: z.string().optional().or(z.literal('')),
  erpCosto: z.string().optional().or(z.literal('')),
  erpUnidades: z.string().optional().or(z.literal('')),
  erpSincronizado: z.boolean().optional(),
  originSource: z.string().optional().or(z.literal('')),
  originSyncId: z.string().optional().or(z.literal('')),
  activo: z.boolean().optional(),
})

export type ArticuloFormValues = z.infer<typeof articuloFormSchema>

interface ArticuloFormProps {
  articulo?: Articulo
  onSuccess?: () => void
  mode: 'create' | 'edit'
  showSubmitButton?: boolean
  onLoadingChange?: (loading: boolean) => void
  formId?: string
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
  )
}

export function ArticuloForm({
  articulo,
  onSuccess,
  mode,
  showSubmitButton = true,
  onLoadingChange,
  formId,
}: ArticuloFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading, onLoadingChange])

  const form = useForm<ArticuloFormValues>({
    resolver: zodResolver(articuloFormSchema),
    defaultValues: {
      codigo: articulo?.codigo ?? '',
      nombre: articulo?.nombre ?? '',
      sku: articulo?.sku ?? '',
      codigoBarras: articulo?.codigoBarras ?? '',
      observaciones: articulo?.observaciones ?? '',
      marca: articulo?.marca ?? '',
      modelo: articulo?.modelo ?? '',
      talle: articulo?.talle ?? '',
      color: articulo?.color ?? '',
      material: articulo?.material ?? '',
      presentacion: articulo?.presentacion ?? '',
      medida: articulo?.medida ?? '',
      precio: articulo?.precio ?? '',
      costo: articulo?.costo ?? '',
      erpId: articulo?.erpId ?? '',
      erpCodigo: articulo?.erpCodigo ?? '',
      erpNombre: articulo?.erpNombre ?? '',
      erpPrecio: articulo?.erpPrecio ?? '',
      erpCosto: articulo?.erpCosto ?? '',
      erpUnidades: articulo?.erpUnidades?.toString() ?? '',
      erpSincronizado: articulo?.erpSincronizado ?? false,
      originSource: articulo?.originSource ?? '',
      originSyncId: articulo?.originSyncId ?? '',
      activo: articulo?.activo ?? true,
    },
  })

  async function onSubmit(values: ArticuloFormValues) {
    setIsLoading(true)
    try {
      if (mode === 'create') {
        await createArticulo(values)
        toast({
          title: 'Articulo creado',
          description: `El articulo "${values.nombre}" se creo correctamente.`,
        })
      } else {
        await updateArticulo(articulo!.codigo, values)
        toast({
          title: 'Articulo actualizado',
          description: `El articulo "${values.nombre}" se actualizo correctamente.`,
        })
      }
      onSuccess?.()
    } catch (error) {
      toast({
        title: mode === 'create' ? 'Error al crear el articulo' : 'Error al actualizar el articulo',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Identificacion */}
        <div className="border rounded-sm p-4 space-y-3">
          <SectionHeader title="Identificacion" />

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codigo *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ART-001"
                      disabled={mode === 'edit'}
                      className="h-9"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="SKU (opcional)" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre *</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre del articulo" className="h-9" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="codigoBarras"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Codigo de barras</FormLabel>
                <FormControl>
                  <Input placeholder="Codigo de barras (opcional)" className="h-9" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Propiedades */}
        <div className="border rounded-sm p-4 space-y-3">
          <SectionHeader title="Propiedades" />

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="marca"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl>
                    <Input placeholder="Marca" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="modelo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <FormControl>
                    <Input placeholder="Modelo" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="talle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Talle</FormLabel>
                  <FormControl>
                    <Input placeholder="Talle" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Input placeholder="Color" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="material"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material</FormLabel>
                  <FormControl>
                    <Input placeholder="Material" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="presentacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Presentacion</FormLabel>
                  <FormControl>
                    <Input placeholder="Presentacion" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="medida"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Medida</FormLabel>
                <FormControl>
                  <Input placeholder="Medida" className="h-9" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Precios */}
        <div className="border rounded-sm p-4 space-y-3">
          <SectionHeader title="Precios" />

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="precio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="h-9"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="costo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="h-9"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <p className="text-xs text-muted-foreground">Los precios se guardan con 2 decimales</p>
        </div>

        {/* Observaciones */}
        <div className="border rounded-sm p-4 space-y-3">
          <SectionHeader title="Observaciones" />
          <FormField
            control={form.control}
            name="observaciones"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Observaciones o notas adicionales"
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ERP + Origen collapsibles */}
        <div className="flex gap-2">
          <Collapsible className="flex-1 border rounded-sm">
            <CollapsibleTrigger className="flex w-full items-center gap-2 p-3 text-sm font-medium hover:bg-muted/50 [&[data-state=open]>svg]:rotate-90">
              <ChevronRight className="h-4 w-4 transition-transform" />
              ERP
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="erpId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ERP ID</FormLabel>
                      <FormControl>
                        <Input placeholder="ID en ERP" className="h-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="erpCodigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ERP Codigo</FormLabel>
                      <FormControl>
                        <Input placeholder="Codigo en ERP" className="h-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="erpNombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ERP Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre en ERP" className="h-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="erpPrecio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ERP Precio</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          className="h-9"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="erpCosto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ERP Costo</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          className="h-9"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="erpUnidades"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ERP Unidades</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" className="h-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="erpSincronizado"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-sm border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Sincronizado con ERP</FormLabel>
                      <FormDescription>
                        Indica si este articulo esta sincronizado con el sistema ERP
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>

          <Collapsible className="flex-1 border rounded-sm">
            <CollapsibleTrigger className="flex w-full items-center gap-2 p-3 text-sm font-medium hover:bg-muted/50 [&[data-state=open]>svg]:rotate-90">
              <ChevronRight className="h-4 w-4 transition-transform" />
              Origen
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="originSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuente de origen</FormLabel>
                      <FormControl>
                        <Input placeholder="Fuente" className="h-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="originSyncId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID de sincronizacion</FormLabel>
                      <FormControl>
                        <Input placeholder="Sync ID" className="h-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {mode === 'edit' && articulo?.originSyncedAt && (
                <div className="text-sm text-muted-foreground">
                  Ultima sincronizacion: {new Date(articulo.originSyncedAt).toLocaleString('es-MX')}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Submit — only if showSubmitButton is true */}
        {showSubmitButton && (
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Crear articulo' : 'Guardar cambios'}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}
```

Key changes from current:

- Added props: `showSubmitButton` (default true), `onLoadingChange` callback, `formId` for external submit
- Sections wrapped in `border rounded-sm p-4` cards
- ERP and Origen as side-by-side Collapsibles
- SectionHeader unified to `text-xs uppercase tracking-wide`
- Input heights `h-9` (Tabler), gaps `gap-3`
- Removed `Separator` between sections (cards provide visual separation)
- `space-y-8` → `space-y-4` (tighter)

- [ ] **Step 2: Verify the app compiles**

Run: `cd apps/web && pnpm build --no-lint 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/articulos/articulo-form.tsx
git commit -m "refactor(ui): restructure ArticuloForm with section cards, collapsible ERP/Origen, new props"
```

---

## Chunk 3: Edit Page Redesign

### Task 3: Rewrite edit page with sticky header, 2-col layout, image placeholders

**Files:**

- Rewrite: `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx`

- [ ] **Step 1: Replace the full edit page component**

Rewrite `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx`:

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ImagePlus, Loader2 } from 'lucide-react'

import type { Articulo } from '@/types/articulo'
import { fetchArticuloByCodigoClient, toggleArticuloActivo } from '@/lib/api.client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ArticuloForm } from '@/components/articulos/articulo-form'
import { useToast } from '@/hooks/use-toast'

function ImagePlaceholderGrid({ title, count }: { title: string; count: number }) {
  return (
    <div className="border rounded-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>
          <ImagePlus className="mr-1 h-3.5 w-3.5" />
          Subir
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-sm bg-muted flex items-center justify-center"
          >
            <ImagePlus className="h-6 w-6 text-muted-foreground/40" />
          </div>
        ))}
      </div>
      <div className="border-2 border-dashed rounded-sm p-4 text-center">
        <p className="text-xs text-muted-foreground">Arrastra imagenes o hace click para subir</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Disponible proximamente</p>
      </div>
    </div>
  )
}

export default function EditarArticuloPage() {
  const params = useParams<{ codigo: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const codigo = decodeURIComponent(params.codigo)

  const [articulo, setArticulo] = useState<Articulo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showToggleDialog, setShowToggleDialog] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  const loadArticulo = useCallback(async () => {
    try {
      const data = await fetchArticuloByCodigoClient(codigo)
      setArticulo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el articulo')
    } finally {
      setLoading(false)
    }
  }, [codigo])

  useEffect(() => {
    loadArticulo()
  }, [loadArticulo])

  async function handleConfirmToggle() {
    if (!articulo) return
    setShowToggleDialog(false)
    try {
      const updated = await toggleArticuloActivo(articulo.codigo)
      setArticulo(updated)
      toast({
        title: updated.activo ? 'Articulo activado' : 'Articulo desactivado',
        description: `"${updated.nombre}" ahora esta ${updated.activo ? 'activo' : 'inactivo'}.`,
      })
    } catch (err) {
      toast({
        title: 'Error al cambiar el estado',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !articulo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/articulos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{error || 'Articulo no encontrado'}</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/articulos">Volver a la lista</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b -mx-6 px-6 py-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/articulos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
            <h1 className="text-lg font-semibold tracking-tight truncate max-w-[300px]">
              Editar: {articulo.nombre}
            </h1>
            <Badge variant={articulo.activo ? 'default' : 'secondary'} className="shrink-0">
              {articulo.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={articulo.activo ? 'destructive' : 'outline'}
              size="sm"
              className="h-8 text-sm"
              onClick={() => setShowToggleDialog(true)}
            >
              {articulo.activo ? 'Desactivar' : 'Reactivar'}
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-sm"
              form="articulo-edit-form"
              disabled={formLoading}
            >
              {formLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div>
          <ArticuloForm
            mode="edit"
            articulo={articulo}
            onSuccess={() => router.push('/articulos')}
            showSubmitButton={false}
            onLoadingChange={setFormLoading}
            formId="articulo-edit-form"
          />
        </div>

        {/* Right: Image placeholders */}
        <div className="space-y-4">
          <ImagePlaceholderGrid title="Imagenes Producto" count={6} />
          <ImagePlaceholderGrid title="Imagenes Etiquetas" count={3} />
        </div>
      </div>

      <AlertDialog open={showToggleDialog} onOpenChange={setShowToggleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {articulo.activo ? '¿Desactivar articulo?' : '¿Reactivar articulo?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {articulo.activo
                ? `"${articulo.nombre}" no aparecera en la lista principal.`
                : `"${articulo.nombre}" volvera a aparecer en la lista.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmToggle}>
              {articulo.activo ? 'Desactivar' : 'Reactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

Key changes from current:

- Sticky header with `form="articulo-edit-form"` button
- `formLoading` state synced via `onLoadingChange` callback
- Two-column responsive grid `grid-cols-1 lg:grid-cols-2`
- `ImagePlaceholderGrid` component for image section placeholders (6 product + 3 label)
- Removed `mx-auto max-w-2xl` wrapper
- Title uses `truncate max-w-[300px]`

- [ ] **Step 2: Verify the app compiles**

Run: `cd apps/web && pnpm build --no-lint 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Quick smoke test**

Run dev server and verify:

- Navigate to articulos list → click row → sheet opens with hero cards
- Click Editar → edit page loads with sticky header and 2-col layout
- Click Guardar → form submits correctly
- Navigate to /articulos/nuevo → form shows with internal submit button

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx
git commit -m "refactor(ui): redesign edit page with sticky header, 2-col layout, image placeholders"
```
