'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'

import type { Articulo } from '@/types/articulo'
import { createArticulo, updateArticulo } from '@/lib/api.client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
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
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
      <Separator />
    </div>
  )
}

export function ArticuloForm({ articulo, onSuccess, mode }: ArticuloFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Section 1 — Identificacion */}
        <div className="space-y-4">
          <SectionHeader title="Identificacion" />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codigo *</FormLabel>
                  <FormControl>
                    <Input placeholder="ART-001" disabled={mode === 'edit'} {...field} />
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
                  <Input placeholder="Nombre del articulo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="SKU (opcional)" {...field} />
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
                    <Input placeholder="Codigo de barras (opcional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="observaciones"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observaciones</FormLabel>
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

        {/* Section 2 — Propiedades */}
        <div className="space-y-4">
          <SectionHeader title="Propiedades" />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="marca"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl>
                    <Input placeholder="Marca (opcional)" {...field} />
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
                    <Input placeholder="Modelo (opcional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="talle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Talle</FormLabel>
                  <FormControl>
                    <Input placeholder="Talle (opcional)" {...field} />
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
                    <Input placeholder="Color (opcional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="material"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material</FormLabel>
                  <FormControl>
                    <Input placeholder="Material (opcional)" {...field} />
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
                    <Input placeholder="Presentacion (opcional)" {...field} />
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
                  <Input placeholder="Medida (opcional)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Section 3 — Precios */}
        <div className="space-y-4">
          <SectionHeader title="Precios" />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="precio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio</FormLabel>
                  <FormControl>
                    <Input type="text" inputMode="decimal" placeholder="0.00" {...field} />
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
                    <Input type="text" inputMode="decimal" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <p className="text-xs text-muted-foreground">Los precios se guardan con 2 decimales</p>
        </div>

        {/* Section 4 — Imagenes */}
        <div className="space-y-4">
          <SectionHeader title="Imagenes" />
          <p className="text-sm text-muted-foreground">
            La gestion de imagenes estara disponible proximamente
          </p>
        </div>

        {/* Section 5 — ERP */}
        <div className="space-y-4">
          <SectionHeader title="ERP" />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="erpId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ERP ID</FormLabel>
                  <FormControl>
                    <Input placeholder="ID en ERP" {...field} />
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
                    <Input placeholder="Codigo en ERP" {...field} />
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
                  <Input placeholder="Nombre en ERP" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="erpPrecio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ERP Precio</FormLabel>
                  <FormControl>
                    <Input type="text" inputMode="decimal" placeholder="0.00" {...field} />
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
                    <Input type="text" inputMode="decimal" placeholder="0.00" {...field} />
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
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="erpSincronizado"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
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
        </div>

        {/* Section 6 — Origen */}
        <div className="space-y-4">
          <SectionHeader title="Origen" />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="originSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fuente de origen</FormLabel>
                  <FormControl>
                    <Input placeholder="Fuente (opcional)" {...field} />
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
                    <Input placeholder="Sync ID (opcional)" {...field} />
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
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Crear articulo' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
