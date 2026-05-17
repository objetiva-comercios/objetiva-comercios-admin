'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createPropiedad } from '@/lib/api.client'
import { suggestAbrev } from '@/lib/abrev'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import {
  PROP_LABELS,
  PROP_NOMBRE_PLACEHOLDERS,
  copyFor,
  type Propiedad,
  type PropTipo,
} from '@/types/propiedad'

const schema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es requerido').max(255, 'Máximo 255 caracteres'),
  abrev: z
    .string()
    .regex(/^[A-Z0-9]{1,8}$/, 'La abreviación debe tener 1 a 8 caracteres en mayúsculas o dígitos'),
})
type FormValues = z.infer<typeof schema>

export interface PropiedadCreateDialogProps {
  /** Tipo de propiedad (drives title, copy, endpoint). */
  propTipo: PropTipo
  /** Phase 32 reuse hook — invocado tras éxito con la fila creada. */
  onCreated?: (created: Propiedad) => void
  /** Trigger custom — si no se provee, el padre controla open/onOpenChange. */
  trigger?: ReactNode
  /** Modo controlled (opcional). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /**
   * Phase 30 — slot opcional para inyectar controles extra (ej. select de
   * subcategoría para el dialog de Familias). Se renderiza entre el FormField
   * de `abrev` y el DialogFooter.
   *
   * **Estética Tabler:** los controles inyectados deben respetar `h-9`, border-
   * radius `md`, `text-sm` y `bg` explícito en form controls (per
   * shadcn-tabler-mcp). Para el control padre conviene wrappear en un
   * `<div className="space-y-2">` para mantener consistencia visual con los
   * FormField de shadcn/ui.
   */
  extraFields?: ReactNode
  /**
   * Phase 30 — contribuye keys/values al body del POST al backend además de
   * `{nombre, abrev}`. Ejemplo Familias: `() => ({ parentId: subcategoriaId })`.
   * Si retorna `undefined`/`{}` el body queda como `{nombre, abrev}` (default).
   */
  buildExtraPayload?: () => Record<string, unknown>
  /**
   * Phase 30 — validación cliente del estado de `extraFields`. Si retorna un
   * string no-null se muestra como error y NO se envía el submit. Ejemplo
   * Familias: `() => parentId == null ? 'Seleccioná una subcategoría' : null`.
   */
  validateExtra?: () => string | null
}

export function PropiedadCreateDialog({
  propTipo,
  onCreated,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  extraFields,
  buildExtraPayload,
  validateExtra,
}: PropiedadCreateDialogProps) {
  const { toast } = useToast()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen

  const [isLoading, setIsLoading] = useState(false)
  const [abrevManuallyEdited, setAbrevManuallyEdited] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', abrev: '' },
  })

  // Auto-suggest abrev mientras el usuario no la haya editado manualmente.
  const nombre = form.watch('nombre')
  useEffect(() => {
    if (abrevManuallyEdited) return
    const suggested = suggestAbrev(nombre)
    if (suggested !== form.getValues('abrev')) {
      form.setValue('abrev', suggested, { shouldValidate: false })
    }
  }, [nombre, abrevManuallyEdited, form])

  // Reset al abrir.
  useEffect(() => {
    if (open) {
      form.reset({ nombre: '', abrev: '' })
      setAbrevManuallyEdited(false)
    }
  }, [open, form])

  const label = PROP_LABELS[propTipo]
  const c = copyFor(propTipo)

  async function onSubmit(values: FormValues) {
    // Phase 30 — validación cliente del slot extra antes de tocar el backend.
    if (validateExtra) {
      const extraError = validateExtra()
      if (extraError) {
        toast({
          title: `No se pudo crear ${c.articulo} ${c.singularLower}`,
          description: extraError,
          variant: 'destructive',
        })
        return
      }
    }

    setIsLoading(true)
    try {
      const extra = buildExtraPayload?.() ?? {}
      const body = { ...values, ...extra }
      const created = await createPropiedad(propTipo, body)
      toast({ title: `${c.singular} ${c.creada} correctamente` })
      onCreated?.(created)
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      const lower = message.toLowerCase()
      // Match palabras completas para evitar colisiones (ej. "abreviación del nombre"
      // que contiene "nombre" como substring). `abrev` debe matchearse antes que
      // `nombre` por especificidad.
      if (/\babrev(?:iación)?\b/.test(lower)) {
        form.setError('abrev', { message })
      } else if (/\bnombre\b/.test(lower)) {
        form.setError('nombre', { message })
      } else {
        toast({
          title: `No se pudo crear ${c.articulo} ${c.singularLower}`,
          description: message,
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {c.nuevo} {label.singular}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Completá nombre y abreviación. La abreviación se sugiere automáticamente a partir del
            nombre.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder={PROP_NOMBRE_PLACEHOLDERS[propTipo]} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="abrev"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Abreviación</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: SHI (auto-sugerido)"
                      {...field}
                      onChange={e => {
                        setAbrevManuallyEdited(true)
                        field.onChange(e.target.value.toUpperCase())
                      }}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    1-8 caracteres, solo mayúsculas y dígitos
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Phase 30 — slot opcional para controles extra (ej. select de subcategoría en Familias). */}
            {extraFields ?? null}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear {c.singularLower}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
