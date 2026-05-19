'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ChevronRight, Loader2 } from 'lucide-react'

import type { Articulo } from '@/types/articulo'
import { createArticulo, updateArticulo } from '@/lib/api.client'
import { formatDateTimeES } from '@/lib/dates'
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
import { useArticulosConfig } from '@/hooks/use-articulos-config'

const articuloFormSchema = z.object({
  codigo: z.string().min(1, 'El codigo es obligatorio').max(50),
  nombre: z.string().min(1, 'El nombre es obligatorio').max(255),
  sku: z.string().optional().or(z.literal('')),
  codigoBarras: z.string().optional().or(z.literal('')),
  observaciones: z.string().optional().or(z.literal('')),
  objeto: z.string().optional().or(z.literal('')),
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
  const { isCampoVisible } = useArticulosConfig()

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
      objeto: articulo?.objeto ?? '',
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
      // Sanitize: drop empty-string optional fields and coerce numeric ones.
      // The DTO marks erpUnidades as @IsInt() with @IsOptional, so an empty
      // string from the form trips class-validator. Empty strings on the other
      // optional text fields also waste payload size and break MaxLength
      // checks once a future field declares minLength.
      // On update, the codigo is the PK and the UpdateArticuloDto rejects it
      // (`property codigo should not exist`), so it is only included when
      // creating.
      const payload: Record<string, unknown> = { nombre: values.nombre }
      if (mode === 'create') payload.codigo = values.codigo
      for (const [k, v] of Object.entries(values)) {
        if (k === 'codigo' || k === 'nombre') continue
        if (v === '' || v === undefined || v === null) continue
        if (k === 'erpUnidades') {
          const n = Number(v)
          if (Number.isFinite(n)) payload[k] = n
          continue
        }
        payload[k] = v
      }

      if (mode === 'create') {
        await createArticulo(payload)
        toast({
          title: 'Articulo creado',
          description: `El articulo "${values.nombre}" se creo correctamente.`,
        })
      } else {
        // Phase 31 Deploy 2: PK is sku now; UpdateArticuloDto path keys by sku.
        await updateArticulo(articulo!.sku!, payload)
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
            {isCampoVisible('sku') && (
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
            )}
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

          {isCampoVisible('codigoBarras') && (
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
          )}
        </div>

        {/* Propiedades */}
        {(isCampoVisible('objeto') ||
          isCampoVisible('marca') ||
          isCampoVisible('modelo') ||
          isCampoVisible('talle') ||
          isCampoVisible('color') ||
          isCampoVisible('material') ||
          isCampoVisible('presentacion') ||
          isCampoVisible('medida')) && (
          <div className="border rounded-sm p-4 space-y-3">
            <SectionHeader title="Propiedades" />

            <div className="grid gap-3 sm:grid-cols-2">
              {isCampoVisible('objeto') && (
                <FormField
                  control={form.control}
                  name="objeto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo / Objeto</FormLabel>
                      <FormControl>
                        <Input className="h-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {isCampoVisible('marca') && (
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
              )}
              {isCampoVisible('modelo') && (
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
              )}
              {isCampoVisible('talle') && (
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
              )}
              {isCampoVisible('color') && (
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
              )}
              {isCampoVisible('material') && (
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
              )}
              {isCampoVisible('presentacion') && (
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
              )}
            </div>

            {isCampoVisible('medida') && (
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
            )}
          </div>
        )}

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
            {isCampoVisible('costo') && (
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
            )}
          </div>
          <p className="text-xs text-muted-foreground">Los precios se guardan con 2 decimales</p>
        </div>

        {/* Observaciones */}
        {isCampoVisible('observaciones') && (
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
        )}

        {/* ERP + Origen collapsibles */}
        {(isCampoVisible('erp') || isCampoVisible('origen')) && (
          <div className="flex gap-2">
            {isCampoVisible('erp') && (
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
            )}

            {isCampoVisible('origen') && (
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
                      Ultima sincronizacion: {formatDateTimeES(articulo.originSyncedAt)}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

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
